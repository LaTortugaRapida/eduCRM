// API Configuration
const API_URL = 'http://localhost:3000/api';

// Store token and user info
let currentUser = null;
let authToken = null;

// Check if user is logged in on page load
document.addEventListener('DOMContentLoaded', () => {
    const savedToken = localStorage.getItem('authToken');
    const savedUser = localStorage.getItem('currentUser');
    
    if (savedToken && savedUser) {
        authToken = savedToken;
        currentUser = JSON.parse(savedUser);
        showDashboard();
    } else {
        showSection('login');
    }
});

// Show/Hide Sections
function showSection(sectionName) {
    // Hide all sections
    document.querySelectorAll('.section').forEach(section => {
        section.classList.remove('active');
    });
    
    // Show selected section
    const sectionMap = {
        'login': 'loginSection',
        'signup': 'signupSection',
        'forgotPassword': 'forgotPasswordSection',
        'dashboard': 'dashboardSection'
    };
    
    const sectionId = sectionMap[sectionName];
    if (sectionId) {
        document.getElementById(sectionId).classList.add('active');
    }
    
    // Update navigation
    updateNavigation();
}

// Update Navigation based on auth state
function updateNavigation() {
    const navLinks = document.getElementById('navLinks');
    const userMenu = document.getElementById('userMenu');
    
    if (authToken) {
        navLinks.style.display = 'none';
        userMenu.style.display = 'flex';
        document.getElementById('userName').textContent = currentUser ? 
            (currentUser.name || currentUser.company_name) : 'User';
    } else {
        navLinks.style.display = 'block';
        userMenu.style.display = 'none';
    }
}

// Switch between Individual and Company signup tabs
function switchSignupTab(type) {
    const tabs = document.querySelectorAll('.tab');
    const forms = document.querySelectorAll('.signup-form');
    
    tabs.forEach(tab => tab.classList.remove('active'));
    forms.forEach(form => form.classList.remove('active'));
    
    if (type === 'individual') {
        tabs[0].classList.add('active');
        document.getElementById('individualSignupForm').classList.add('active');
    } else {
        tabs[1].classList.add('active');
        document.getElementById('companySignupForm').classList.add('active');
    }
}

// Toast Notification
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = 'toast ' + type + ' show';
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// Individual Signup Handler
document.getElementById('individualSignupForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const data = {
        name: document.getElementById('indName').value,
        email: document.getElementById('indEmail').value,
        phone: document.getElementById('indPhone').value,
        position: document.getElementById('indPosition').value,
        password: document.getElementById('indPassword').value
    };
    
    try {
        const response = await fetch(API_URL + '/auth/signup/individual', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        
        const result = await response.json();
        
        if (response.ok) {
            showToast('Account created successfully! Please login.', 'success');
            showSection('login');
        } else {
            showToast(result.error || 'Signup failed', 'error');
        }
    } catch (error) {
        showToast('Connection error. Make sure server is running.', 'error');
    }
});

// Company Signup Handler
document.getElementById('companySignupForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const data = {
        company_name: document.getElementById('compName').value,
        email: document.getElementById('compEmail').value,
        password: document.getElementById('compPassword').value,
        company_phone: document.getElementById('compPhone').value,
        owner_name: document.getElementById('compOwner').value,
        owner_phone: document.getElementById('compOwnerPhone').value
    };
    
    try {
        const response = await fetch(API_URL + '/auth/signup/company', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        
        const result = await response.json();
        
        if (response.ok) {
            showToast('Company registered successfully! Please login.', 'success');
            showSection('login');
        } else {
            showToast(result.error || 'Signup failed', 'error');
        }
    } catch (error) {
        showToast('Connection error. Make sure server is running.', 'error');
    }
});

// Login Handler
document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const data = {
        email: document.getElementById('loginEmail').value,
        password: document.getElementById('loginPassword').value,
        userType: document.getElementById('loginUserType').value
    };
    
    try {
        const response = await fetch(API_URL + '/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        
        const result = await response.json();
        
        if (response.ok) {
            authToken = result.token;
            currentUser = result.user;
            
            // Save to localStorage
            localStorage.setItem('authToken', authToken);
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            
            showToast('Login successful!', 'success');
            showDashboard();
        } else {
            showToast(result.error || 'Login failed', 'error');
        }
    } catch (error) {
        showToast('Connection error. Make sure server is running.', 'error');
    }
});

// Forgot Password Handler
document.getElementById('forgotPasswordForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const data = {
        email: document.getElementById('forgotEmail').value,
        userType: document.getElementById('forgotUserType').value
    };
    
    try {
        const response = await fetch(API_URL + '/auth/forgot-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        
        const result = await response.json();
        showToast(result.message || 'Reset link sent', 'success');
        showSection('login');
    } catch (error) {
        showToast('Connection error', 'error');
    }
});

// Logout
function logout() {
    authToken = null;
    currentUser = null;
    localStorage.removeItem('authToken');
    localStorage.removeItem('currentUser');
    showSection('login');
    showToast('Logged out successfully', 'success');
}

// Show Dashboard
function showDashboard() {
    showSection('dashboard');
    loadProfile();
}

// Load Profile
async function loadProfile() {
    try {
        const response = await fetch(API_URL + '/users/profile', {
            headers: { 'Authorization': 'Bearer ' + authToken }
        });
        
        const result = await response.json();
        
        if (response.ok) {
            displayProfile(result.user);
        } else {
            showToast('Session expired. Please login again.', 'error');
            logout();
        }
    } catch (error) {
        showToast('Error loading profile', 'error');
    }
}

// Display Profile Info
function displayProfile(user) {
    const profileDiv = document.getElementById('profileInfo');
    
    if (user.position) {
        // Individual user
        profileDiv.innerHTML = 
            <h3>Profile Information</h3>
            <p><strong>Name:</strong> </p>
            <p><strong>Email:</strong> </p>
            <p><strong>Phone:</strong> </p>
            <p><strong>Position:</strong> </p>
            <p><strong>Member since:</strong> </p>
        ;
    } else {
        // Company user
        profileDiv.innerHTML = 
            <h3>Company Information</h3>
            <p><strong>Company:</strong> </p>
            <p><strong>Email:</strong> </p>
            <p><strong>Company Phone:</strong> </p>
            <p><strong>Owner:</strong> </p>
            <p><strong>Owner Phone:</strong> </p>
            <p><strong>Member since:</strong> </p>
        ;
    }
}

// Change Password Handler
document.getElementById('changePasswordForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const data = {
        currentPassword: document.getElementById('currentPassword').value,
        newPassword: document.getElementById('newPassword').value
    };
    
    try {
        const response = await fetch(API_URL + '/users/change-password', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + authToken
            },
            body: JSON.stringify(data)
        });
        
        const result = await response.json();
        
        if (response.ok) {
            showToast('Password changed successfully!', 'success');
            document.getElementById('changePasswordForm').reset();
        } else {
            showToast(result.error || 'Failed to change password', 'error');
        }
    } catch (error) {
        showToast('Connection error', 'error');
    }
});
