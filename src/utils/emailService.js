const nodemailer = require('nodemailer');

function isSmtpConfigured() {
    return Boolean(
        process.env.SMTP_HOST &&
        process.env.SMTP_USER &&
        process.env.SMTP_PASS &&
        process.env.SMTP_USER !== 'your_email@gmail.com' &&
        process.env.SMTP_PASS !== 'your_app_password'
    );
}

function buildPasswordResetUrl(resetToken, userType) {
    const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:' + (process.env.PORT || 3000)).replace(/\/$/, '');
    return frontendUrl + '/reset-password/' + resetToken + '?type=' + encodeURIComponent(userType);
}

function createTransporter() {
    return nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT || 587),
        secure: process.env.SMTP_PORT === '465',
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
        }
    });
}

const sendPasswordResetEmail = async (email, resetToken, userType) => {
    if (!isSmtpConfigured()) {
        const error = new Error('SMTP is not configured');
        error.code = 'SMTP_NOT_CONFIGURED';
        throw error;
    }

    const resetUrl = buildPasswordResetUrl(resetToken, userType);
    
    const mailOptions = {
        from: process.env.SMTP_USER,
        to: email,
        subject: 'Password Reset Request - EduCRM',
        html: '<div style="font-family:Arial,sans-serif;line-height:1.6;color:#1F2937;max-width:560px;margin:0 auto;padding:24px;">' +
            '<h2 style="margin:0 0 12px;">Reset your EduCRM password</h2>' +
            '<p>You requested a password reset for your EduCRM account.</p>' +
            '<p>Use the button below to create a new password. This link expires in 1 hour.</p>' +
            '<p><a href="' + resetUrl + '" style="display:inline-block;background-color:#2B8A7E;color:white;padding:11px 18px;text-decoration:none;border-radius:8px;font-weight:700;">Reset Password</a></p>' +
            '<p style="font-size:13px;color:#64748B;">If the button does not work, paste this link into your browser:<br>' + resetUrl + '</p>' +
            '<p style="font-size:13px;color:#64748B;">If you did not request this, you can ignore this email.</p>' +
            '</div>'
    };

    await createTransporter().sendMail(mailOptions);
};

module.exports = {
    buildPasswordResetUrl,
    isSmtpConfigured,
    sendPasswordResetEmail
};
