document.getElementById('individualSignupForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // Reset errors
    clearErrors();
    
    // Get form values
    const name = document.getElementById('name').value.trim();
    const email = document.getElementById('email').value.trim().toLowerCase();
    const phone = document.getElementById('phone').value.trim();
    const position = document.getElementById('position').value;
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    
    // Validate
    let hasError = false;
    
    if (!name) {
        showError('nameError', 'Name is required');
        hasError = true;
    }
    
    if (!email) {
        showError('emailError', 'Email is required');
        hasError = true;
    } else if (!isValidEmail(email)) {
        showError('emailError', 'Please enter a valid email');
        hasError = true;
    }
    
    if (!phone) {
        showError('phoneError', 'Phone number is required');
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
    submitBtn.innerHTML = '<div class="loading-spinner"></div> Creating Account...';
    
    // Send request
    try {
        const response = await fetch(API_URL + '/auth/signup/individual', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, phone, position, password })
        });
        
        const result = await response.json();
        
        if (response.ok) {
            showToast('Account created successfully! Redirecting to login...', 'success');
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 2000);
        } else {
            showToast(result.error || 'Signup failed', 'error');
            if (result.error && result.error.includes('email')) {
                showError('emailError', result.error);
            }
        }
    } catch (error) {
        showToast('Connection error. Make sure the server is running on port 3000', 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = 'Create Account';
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
