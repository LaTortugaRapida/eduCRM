document.getElementById('forgotPasswordForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('email').value.trim().toLowerCase();
    const resetLinkPanel = document.getElementById('resetLinkPanel');
    const resetLinkAnchor = document.getElementById('resetLinkAnchor');
    resetLinkPanel.hidden = true;
    
    if (!email) {
        showToast('Please enter your email', 'error');
        return;
    }
    
    if (!isValidEmail(email)) {
        showToast('Please enter a valid email', 'error');
        return;
    }
    
    const submitBtn = document.querySelector('#forgotPasswordForm .btn-primary');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Sending...';
    
    try {
        const response = await fetch(API_URL + '/auth/forgot-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });
        
        const result = await response.json();
        if (response.ok) {
            showToast(result.message || 'Reset link sent to your email', 'success');
            if (result.resetLink) {
                resetLinkAnchor.href = result.resetLink;
                resetLinkAnchor.textContent = result.resetLink;
                resetLinkPanel.hidden = false;
            } else {
                setTimeout(() => {
                    window.location.href = 'login.html';
                }, 2200);
            }
        } else {
            showToast(result.error || 'Unable to send reset link', 'error');
        }
    } catch (error) {
        showToast('Connection error', 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Send Reset Link';
    }
});
