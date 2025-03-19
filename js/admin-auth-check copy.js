// Check if user is logged in and is an admin
document.addEventListener('DOMContentLoaded', function() {
    const user = JSON.parse(localStorage.getItem('user'));
    
    if (!user || user.role !== 'admin') {
        window.location.href = '../login.html';
        return;
    }

    // Update username display if element exists
    const usernameDisplay = document.querySelector('.username-display');
    if (usernameDisplay) {
        usernameDisplay.textContent = `Welcome, ${user.name}`;
    }
}); 