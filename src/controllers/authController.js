const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Individual = require("../models/Individual");
const Company = require("../models/Company");
const { generateResetToken } = require("../utils/tokenGenerator");
const {
  buildPasswordResetUrl,
  sendPasswordResetEmail,
} = require("../utils/emailService");
const { normalizeEmail, isValidEmail } = require("../utils/emailValidation");

async function findAccountByEmail(email) {
  const normalizedEmail = normalizeEmail(email);
  const individual = await Individual.findByEmail(normalizedEmail);
  if (individual) {
    return { user: individual, userType: "individual" };
  }

  const company = await Company.findByEmail(normalizedEmail);
  if (company) {
    return { user: company, userType: "company" };
  }

  return { user: null, userType: null };
}

exports.individualSignup = async (req, res) => {
  try {
    const { name, password, phone, position } = req.body;
    const email = normalizeEmail(req.body.email);
    const institution_email = normalizeEmail(req.body.institution_email);

    // Emails must be unique across every account type.
    const existingUser = (await Individual.findByEmail(email)) || (await Company.findByEmail(email));
    if (existingUser) {
      return res.status(400).json({ error: "Email already registered" });
    }

    // Find institution by the company email provided
    let institution_id = null;
    let institution_name = null;

    if (institution_email) {
      const company = await Company.findByEmail(institution_email);
      if (!company) {
        return res.status(400).json({
          error:
            "Institution not found. Please make sure the company is registered first or check the email address.",
        });
      }
      institution_id = company.id;
      institution_name = company.company_name;
    } else {
      return res.status(400).json({
        error:
          "Institution email is required. Please provide your company/institution email to link your account.",
      });
    }

    const user = await Individual.create({
      name,
      email,
      password,
      phone,
      position,
      institution_id,
    });

    const token = jwt.sign(
      { id: user.id, email: user.email, type: "individual" },
      process.env.JWT_SECRET,
      { expiresIn: "24h" },
    );

    res.status(201).json({
      message:
        "Individual account created successfully and linked to " +
        institution_name,
      token,
      user: { id: user.id, name, email, phone, position, institution_name },
    });
  } catch (error) {
    console.error("Individual signup error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

exports.companySignup = async (req, res) => {
  try {
    const {
      company_name,
      password,
      company_phone,
      owner_name,
      owner_phone,
    } = req.body;
    const email = normalizeEmail(req.body.email);

    const existingAccount = (await Individual.findByEmail(email)) || (await Company.findByEmail(email));
    if (existingAccount) {
      return res
        .status(400)
        .json({ error: "Email already registered" });
    }

    const company = await Company.create({
      company_name,
      email,
      password,
      company_phone,
      owner_name,
      owner_phone,
    });

    const token = jwt.sign(
      { id: company.id, email: company.email, type: "company" },
      process.env.JWT_SECRET,
      { expiresIn: "24h" },
    );

    res.status(201).json({
      message: "Company account created successfully",
      token,
      company: {
        id: company.id,
        company_name,
        email,
        company_phone,
        owner_name,
        owner_phone,
      },
    });
  } catch (error) {
    console.error("Company signup error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

exports.login = async (req, res) => {
  try {
    const { password, userType } = req.body;
    const email = normalizeEmail(req.body.email);

    if (!email || !password || !userType) {
      return res
        .status(400)
        .json({ error: "Email, password, and user type are required" });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({ error: "Invalid email format" });
    }

    let user;
    if (userType === "individual") {
      user = await Individual.findByEmail(email);
    } else if (userType === "company") {
      user = await Company.findByEmail(email);
    } else {
      return res.status(400).json({ error: "Invalid user type" });
    }

    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, type: userType },
      process.env.JWT_SECRET,
      { expiresIn: "24h" },
    );

    const { password: _, ...userWithoutPassword } = user;

    res.json({
      message: "Login successful",
      token,
      user: userWithoutPassword,
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

exports.forgotPassword = async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);

    if (!email) {
      return res
        .status(400)
        .json({ error: "Email is required" });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({ error: "Invalid email format" });
    }

    const { user, userType } = await findAccountByEmail(email);

    if (!user) {
      return res.json({
        message: "If the email exists, a password reset link will be sent",
      });
    }

    const resetToken = generateResetToken();
    const resetTokenExpiry = new Date(Date.now() + 3600000);

    if (userType === "individual") {
      await Individual.setResetToken(email, resetToken, resetTokenExpiry);
    } else {
      await Company.setResetToken(email, resetToken, resetTokenExpiry);
    }

    try {
      await sendPasswordResetEmail(email, resetToken, userType);
    } catch (emailError) {
      console.error("Password reset email error:", emailError);

      if (process.env.NODE_ENV !== "production") {
        const resetLink = buildPasswordResetUrl(resetToken, userType);
        console.warn("Local password reset link:", resetLink);
        return res.json({
          message:
            "Email is not configured. Use the local reset link below to continue.",
          resetLink,
        });
      }

      return res.status(502).json({
        error:
          "Could not send the reset email. Check SMTP settings and try again.",
      });
    }

    res.json({ message: "Password reset link sent to email" });
  } catch (error) {
    console.error("Forgot password error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const { token, newPassword, userType } = req.body;

    if (!token || !newPassword || !userType) {
      return res
        .status(400)
        .json({ error: "Token, new password, and user type are required" });
    }

    if (newPassword.length < 8) {
      return res
        .status(400)
        .json({ error: "Password must be at least 8 characters" });
    }

    let user;
    if (userType === "individual") {
      user = await Individual.findByResetToken(token);
    } else if (userType === "company") {
      user = await Company.findByResetToken(token);
    } else {
      return res.status(400).json({ error: "Invalid user type" });
    }

    if (!user) {
      return res.status(400).json({ error: "Invalid or expired reset token" });
    }

    if (userType === "individual") {
      await Individual.updatePassword(user.id, newPassword);
    } else {
      await Company.updatePassword(user.id, newPassword);
    }

    res.json({ message: "Password reset successful" });
  } catch (error) {
    console.error("Reset password error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

exports.searchInstitutions = async (req, res) => {
  try {
    const email = normalizeEmail(req.query.email);
    if (!email) {
      return res.json({ companies: [] });
    }
    const companies = await Company.searchByEmail(email);
    res.json({ companies });
  } catch (error) {
    console.error("Search institutions error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
