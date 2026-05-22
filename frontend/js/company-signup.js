document.getElementById('companySignupForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // Reset errors
    clearErrors();
    
    // Get form values
    const company_name = document.getElementById('companyName').value.trim();
    const email = document.getElementById('companyEmail').value.trim().toLowerCase();
    const company_phone = document.getElementById('companyPhone').value.trim();
    const owner_name = document.getElementById('ownerName').value.trim();
    const owner_phone = document.getElementById('ownerPhone').value.trim();
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    
    // Validate
    let hasError = false;
    
    if (!company_name) {
        showError('companyNameError', 'Company name is required');
        hasError = true;
    }
    
    if (!email) {
        showError('companyEmailError', 'Email is required');
        hasError = true;
    } else if (!isValidEmail(email)) {
        showError('companyEmailError', 'Please enter a valid email');
        hasError = true;
    }
    
    if (!company_phone) {
        showError('companyPhoneError', 'Company phone is required');
        hasError = true;
    }
    
    if (!owner_name) {
        showError('ownerNameError', 'Owner name is required');
        hasError = true;
    }
    
    if (!owner_phone) {
        showError('ownerPhoneError', 'Owner phone is required');
        hasError = true;
    }
    
    if (!password) {
        showError('passwordError', 'Password is required');
        hasError = true;
    } else if (password.length < 8) {
        showError('passwordError', 'Password must be at least 8 characters');
        hasError = true;
    }
    
    if (password !== confirmPassword) {
        showError('confirmPasswordError', 'Passwords do not match');
        hasError = true;
    }
    
    if (hasError) return;
    
    // Disable button and show loading
    const submitBtn = document.querySelector('.submit-btn');
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<div class="loading-spinner"></div> Registering Company...';
    
    // Send request
    try {
        const response = await fetch(API_URL + '/auth/signup/company', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                company_name, email, password, company_phone, owner_name, owner_phone 
            })
        });
        
        const result = await response.json();
        
        if (response.ok) {
            showToast('Company registered successfully! Redirecting to login...', 'success');
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 2000);
        } else {
            showToast(result.error || 'Registration failed', 'error');
            if (result.error && result.error.includes('email')) {
                showError('companyEmailError', result.error);
            }
        }
    } catch (error) {
        showToast('Connection error. Make sure the server is running on port 3000', 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = 'Register Company';
    }
});

// Real-time password strength indicator
document.getElementById('password').addEventListener('input', function() {
    updatePasswordStrength(this.value, 'strengthBar');
});

// Real-time validation
document.getElementById('confirmPassword').addEventListener('input', function() {
    const password = document.getElementById('password').value;
    if (this.value && this.value !== password) {
        showError('confirmPasswordError', 'Passwords do not match');
    } else {
        clearError('confirmPasswordError');
    }
});

function showError(elementId, message) {
    const element = document.getElementById(elementId);
    if (element) {
        element.textContent = message;
    }
}

function clearError(elementId) {
    const element = document.getElementById(elementId);
    if (element) {
        element.textContent = '';
    }
}

function clearErrors() {
    const errors = document.querySelectorAll('.error-message');
    errors.forEach(error => error.textContent = '');
}
