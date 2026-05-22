var pathParts = window.location.pathname.split('/').filter(Boolean);
var resetToken = pathParts[pathParts.length - 1];
var userType = new URLSearchParams(window.location.search).get('type');

if (!resetToken || resetToken === 'reset-password.html' || !userType) {
    showToast('Invalid reset link', 'error');
}

document.getElementById('newPassword').addEventListener('input', function() {
    updatePasswordStrength(this.value, 'resetPwBar');
});

document.getElementById('resetPasswordForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    document.getElementById('newPasswordError').textContent = '';
    document.getElementById('confirmPasswordError').textContent = '';
    
    var newPassword = document.getElementById('newPassword').value;
    var confirmPassword = document.getElementById('confirmPassword').value;
    var hasError = false;
    
    if (!newPassword || newPassword.length < 8) {
        document.getElementById('newPasswordError').textContent = 'Password must be at least 8 characters';
        hasError = true;
    }
    
    if (newPassword !== confirmPassword) {
        document.getElementById('confirmPasswordError').textContent = 'Passwords do not match';
        hasError = true;
    }
    
    if (!resetToken || !userType) {
        showToast('Invalid reset link', 'error');
        hasError = true;
    }
    
    if (hasError) return;
    
    var submitBtn = document.querySelector('#resetPasswordForm .btn-primary');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Updating...';
    
    try {
        var response = await fetch(API_URL + '/auth/reset-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                token: resetToken,
                userType: userType,
                newPassword: newPassword
            })
        });
        
        var result = await response.json();
        
        if (response.ok) {
            showToast('Password reset successful. Redirecting...', 'success');
            setTimeout(function() {
                window.location.href = '/pages/login.html';
            }, 1400);
        } else {
            showToast(result.error || 'Unable to reset password', 'error');
        }
    } catch (error) {
        showToast('Connection error. Is the server running?', 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Update Password';
    }
});
