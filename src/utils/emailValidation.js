const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeEmail(email) {
    return String(email || '').trim().toLowerCase();
}

function isValidEmail(email) {
    return EMAIL_REGEX.test(normalizeEmail(email));
}

module.exports = {
    normalizeEmail,
    isValidEmail
};
