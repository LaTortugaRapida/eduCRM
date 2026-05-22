const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { validateIndividualSignup, validateCompanySignup } = require('../middleware/validation');

router.post('/signup/individual', validateIndividualSignup, authController.individualSignup);
router.post('/signup/company', validateCompanySignup, authController.companySignup);
router.post('/login', authController.login);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);
router.get('/search-institutions', authController.searchInstitutions);

module.exports = router;