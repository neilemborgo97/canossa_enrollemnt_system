// Check if user is logged in
document.addEventListener('DOMContentLoaded', function() {
    const user = JSON.parse(localStorage.getItem('user'));
    
    // If not logged in, redirect to login page
    if (!user) {
        redirectToLogin();
        return;
    }
    
    // Check if user role matches current section
    const isParentSection = window.location.pathname.includes('/parent/');
    const isAdminSection = window.location.pathname.includes('/admin/');
    
    if (isParentSection && user.role !== 'parent') {
        redirectToLogin();
        return;
    }
    
    if (isAdminSection && user.role !== 'admin') {
        redirectToLogin();
        return;
    }
    
    // Update username in navbar
    const usernameDisplay = document.querySelector('.username-display');
    if (usernameDisplay) {
        usernameDisplay.textContent = `Welcome, ${user.name}`;
    }
    
    // Setup logout functionality
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function(e) {
            e.preventDefault();
            logout();
        });
    }
});

// Redirect to login page
function redirectToLogin() {
    localStorage.removeItem('user');
    window.location.href = '../login.html';
}

// Logout function
function logout() {
    localStorage.removeItem('user');
    window.location.href = '../login.html';
}

// Get current user data
function getCurrentUser() {
    return JSON.parse(localStorage.getItem('user'));
}

// Check if current user is admin
function isAdmin() {
    const user = getCurrentUser();
    return user && user.role === 'admin';
} 