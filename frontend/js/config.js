var API_URL = 'https://edu-crm-api-7b35.onrender.com/api';

function showToast(message, type) {
    type = type || 'success';
    var toast = document.getElementById('toast');
    if (!toast) return;
    
    toast.textContent = message;
    toast.className = 'toast toast-' + type + ' show';
    
    setTimeout(function() {
        toast.classList.remove('show');
    }, 3000);
}

function isValidEmail(email) {
    var regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
}

function checkPasswordStrength(password) {
    var strength = 0;
    if (password.length >= 8) strength++;
    if (password.match(/[a-z]+/)) strength++;
    if (password.match(/[A-Z]+/)) strength++;
    if (password.match(/[0-9]+/)) strength++;
    if (password.match(/[!@#$%^&*(),.?":{}|<>]+/)) strength++;
    return strength;
}

function updatePasswordStrength(password, barId) {
    var bar = document.getElementById(barId);
    if (!bar) return;
    
    var strength = checkPasswordStrength(password);
    bar.className = 'pw-bar';
    
    if (password.length === 0) {
        bar.className = 'pw-bar';
    } else if (strength <= 2) {
        bar.className = 'pw-bar pw-weak';
    } else if (strength === 3) {
        bar.className = 'pw-bar pw-medium';
    } else if (strength === 4) {
        bar.className = 'pw-bar pw-strong';
    } else {
        bar.className = 'pw-bar pw-vstrong';
    }
}
