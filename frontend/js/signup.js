// Tab Switching
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', function() {
        const tab = this.dataset.tab;
        
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        
        document.querySelectorAll('.form-block').forEach(form => form.classList.remove('active'));
        document.getElementById(tab + 'Form').classList.add('active');
    });
});

// ============ INDIVIDUAL SIGNUP ============
document.getElementById('individualForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    clearAllErrors();
    
    const name = document.getElementById('indName').value.trim();
    const email = document.getElementById('indEmail').value.trim().toLowerCase();
    const phone = document.getElementById('indPhone').value.trim();
    const position = document.getElementById('indPosition').value;
    const institution_email = document.getElementById('indInstitution').value.trim().toLowerCase();
    const password = document.getElementById('indPassword').value;
    const confirmPassword = document.getElementById('indConfirmPassword').value;
    
    let hasError = false;
    
    if (!name) {
        showFieldError('indNameError', 'Name is required');
        hasError = true;
    }
    
    if (!email) {
        showFieldError('indEmailError', 'Email is required');
        hasError = true;
    } else if (!isValidEmail(email)) {
        showFieldError('indEmailError', 'Please enter a valid email');
        hasError = true;
    }
    
    if (!phone) {
        showFieldError('indPhoneError', 'Phone number is required');
        hasError = true;
    }
    
    if (!institution_email) {
        showFieldError('indInstitutionError', 'Institution email is required');
        hasError = true;
    } else if (!isValidEmail(institution_email)) {
        showFieldError('indInstitutionError', 'Please enter a valid institution email');
        hasError = true;
    }
    
    if (!password) {
        showFieldError('indPasswordError', 'Password is required');
        hasError = true;
    } else if (password.length < 8) {
        showFieldError('indPasswordError', 'Password must be at least 8 characters');
        hasError = true;
    }
    
    if (password !== confirmPassword) {
        showFieldError('indConfirmPasswordError', 'Passwords do not match');
        hasError = true;
    }
    
    if (hasError) return;
    
    const submitBtn = document.getElementById('indSubmitBtn');
    const submitText = submitBtn.querySelector('.btn-text');
    submitBtn.disabled = true;
    submitBtn.classList.add('loading');
    submitText.textContent = 'Creating Account...';
    
    try {
        const response = await fetch(API_URL + '/auth/signup/individual', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, phone, position, institution_email, password })
        });
        
        const result = await response.json();
        
        if (response.ok) {
            showToast('Account created successfully! Redirecting to login...', 'success');
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 1500);
        } else {
            if (result.error && result.error.toLowerCase().includes('email')) {
                showFieldError('indEmailError', result.error);
            }
            showToast(result.error || 'Signup failed', 'error');
        }
    } catch (error) {
        showToast('Connection error. Make sure the server is running on port 3000', 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.classList.remove('loading');
        submitText.textContent = 'Create Individual Account';
    }
});

// Individual Password Strength
document.getElementById('indPassword').addEventListener('input', function() {
    updatePasswordStrength(this.value, 'indPwBar');
});

document.getElementById('indConfirmPassword').addEventListener('input', function() {
    const password = document.getElementById('indPassword').value;
    if (this.value && this.value !== password) {
        showFieldError('indConfirmPasswordError', 'Passwords do not match');
    } else {
        clearFieldError('indConfirmPasswordError');
    }
});

// ============ COMPANY SIGNUP ============
document.getElementById('companyForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    clearAllErrors();
    
    const company_name = document.getElementById('compName').value.trim();
    const email = document.getElementById('compEmail').value.trim().toLowerCase();
    const company_phone = document.getElementById('compPhone').value.trim();
    const owner_name = document.getElementById('ownerName').value.trim();
    const owner_phone = document.getElementById('ownerPhone').value.trim();
    const password = document.getElementById('compPassword').value;
    const confirmPassword = document.getElementById('compConfirmPassword').value;
    
    let hasError = false;
    
    if (!company_name) {
        showFieldError('compNameError', 'Company name is required');
        hasError = true;
    }
    
    if (!email) {
        showFieldError('compEmailError', 'Email is required');
        hasError = true;
    } else if (!isValidEmail(email)) {
        showFieldError('compEmailError', 'Please enter a valid email');
        hasError = true;
    }
    
    if (!company_phone) {
        showFieldError('compPhoneError', 'Company phone is required');
        hasError = true;
    }
    
    if (!owner_name) {
        showFieldError('ownerNameError', 'Owner name is required');
        hasError = true;
    }
    
    if (!owner_phone) {
        showFieldError('ownerPhoneError', 'Owner phone is required');
        hasError = true;
    }
    
    if (!password) {
        showFieldError('compPasswordError', 'Password is required');
        hasError = true;
    } else if (password.length < 8) {
        showFieldError('compPasswordError', 'Password must be at least 8 characters');
        hasError = true;
    }
    
    if (password !== confirmPassword) {
        showFieldError('compConfirmPasswordError', 'Passwords do not match');
        hasError = true;
    }
    
    if (hasError) return;
    
    const submitBtn = document.getElementById('compSubmitBtn');
    const submitText = submitBtn.querySelector('.btn-text');
    submitBtn.disabled = true;
    submitBtn.classList.add('loading');
    submitText.textContent = 'Registering...';
    
    try {
        const response = await fetch(API_URL + '/auth/signup/company', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ company_name, email, password, company_phone, owner_name, owner_phone })
        });
        
        const result = await response.json();
        
        if (response.ok) {
            showToast('Company registered successfully! Redirecting to login...', 'success');
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 1500);
        } else {
            if (result.error && result.error.toLowerCase().includes('email')) {
                showFieldError('compEmailError', result.error);
            }
            showToast(result.error || 'Registration failed', 'error');
        }
    } catch (error) {
        showToast('Connection error. Make sure the server is running on port 3000', 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.classList.remove('loading');
        submitText.textContent = 'Register Company';
    }
});

// Company Password Strength
document.getElementById('compPassword').addEventListener('input', function() {
    updatePasswordStrength(this.value, 'compPwBar');
});

document.getElementById('compConfirmPassword').addEventListener('input', function() {
    const password = document.getElementById('compPassword').value;
    if (this.value && this.value !== password) {
        showFieldError('compConfirmPasswordError', 'Passwords do not match');
    } else {
        clearFieldError('compConfirmPasswordError');
    }
});

// ============ HELPER FUNCTIONS ============
function showFieldError(elementId, message) {
    const element = document.getElementById(elementId);
    if (element) element.textContent = message;
}

function clearFieldError(elementId) {
    const element = document.getElementById(elementId);
    if (element) element.textContent = '';
}

function clearAllErrors() {
    document.querySelectorAll('.form-error').forEach(el => el.textContent = '');
}
