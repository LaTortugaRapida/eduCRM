// Check if already logged in
if (localStorage.getItem('authToken') || sessionStorage.getItem('authToken')) {
    window.location.href = 'dashboard.html';
}

document.getElementById('loginForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    // Clear errors
    document.querySelectorAll('.form-error').forEach(function(el) { el.textContent = ''; });
    
    var email = document.getElementById('email').value.trim().toLowerCase();
    var password = document.getElementById('password').value;
    var userType = document.getElementById('userType').value;
    var rememberMe = document.getElementById('rememberMe').checked;
    
    var hasError = false;
    
    if (!email) {
        document.getElementById('emailError').textContent = 'Email is required';
        hasError = true;
    } else if (!isValidEmail(email)) {
        document.getElementById('emailError').textContent = 'Please enter a valid email';
        hasError = true;
    }
    
    if (!password) {
        document.getElementById('passwordError').textContent = 'Password is required';
        hasError = true;
    }
    
    if (!userType) {
        showToast('Please select account type', 'error');
        hasError = true;
    }
    
    if (hasError) return;
    
    var submitBtn = document.querySelector('#loginForm .btn-primary');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Logging in...';
    
    try {
        var response = await fetch(API_URL + '/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                email: email, 
                password: password, 
                userType: userType 
            })
        });
        
        var result = await response.json();
        
        if (response.ok) {
            if (rememberMe) {
                localStorage.setItem('authToken', result.token);
                localStorage.setItem('currentUser', JSON.stringify(result.user));
            } else {
                sessionStorage.setItem('authToken', result.token);
                sessionStorage.setItem('currentUser', JSON.stringify(result.user));
            }
            
            showToast('Login successful! Redirecting...', 'success');
            setTimeout(function() {
                window.location.href = 'dashboard.html';
            }, 800);
        } else {
            showToast(result.error || 'Invalid credentials', 'error');
        }
    } catch (error) {
        console.error('Login error:', error);
        showToast('Connection error. Is the server running?', 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Login';
    }
});
