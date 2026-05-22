const { normalizeEmail, isValidEmail } = require("../utils/emailValidation");

const validateIndividualSignup = (req, res, next) => {
  const { name, email, password, phone, institution_email } = req.body;

  if (!name || !email || !password || !phone) {
    return res
      .status(400)
      .json({ error: "Name, email, password, and phone are required" });
  }

  if (!institution_email) {
    return res.status(400).json({
      error:
        "Institution email is required. Enter your company/institution email to link your account.",
    });
  }

  if (password.length < 8) {
    return res
      .status(400)
      .json({ error: "Password must be at least 8 characters" });
  }

  req.body.email = normalizeEmail(email);
  req.body.institution_email = normalizeEmail(institution_email);

  if (!isValidEmail(req.body.email)) {
    return res
      .status(400)
      .json({ error: "Invalid email format for your personal email" });
  }

  if (!isValidEmail(req.body.institution_email)) {
    return res
      .status(400)
      .json({ error: "Invalid email format for institution email" });
  }

  next();
};

const validateCompanySignup = (req, res, next) => {
  const {
    company_name,
    email,
    password,
    company_phone,
    owner_name,
    owner_phone,
  } = req.body;

  if (
    !company_name ||
    !email ||
    !password ||
    !company_phone ||
    !owner_name ||
    !owner_phone
  ) {
    return res
      .status(400)
      .json({ error: "All fields are required for company registration" });
  }

  if (password.length < 8) {
    return res
      .status(400)
      .json({ error: "Password must be at least 8 characters" });
  }

  req.body.email = normalizeEmail(email);

  if (!isValidEmail(req.body.email)) {
    return res.status(400).json({ error: "Invalid email format" });
  }

  next();
};

module.exports = { validateIndividualSignup, validateCompanySignup };
