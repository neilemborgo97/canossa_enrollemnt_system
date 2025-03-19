// Check if user is logged in and is an admin
document.addEventListener('DOMContentLoaded', function() {
    const user = JSON.parse(localStorage.getItem('user'));
    
    // If not logged in, redirect to login page
    if (!user) {
        redirectToLogin();
        return;
    }
    
    // Check if user is an admin
    if (user.role !== 'admin') {
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