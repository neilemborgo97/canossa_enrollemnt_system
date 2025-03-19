document.addEventListener('DOMContentLoaded', function() {
    // Check if user is already logged in
    const user = JSON.parse(localStorage.getItem('user'));
    if (user) {
        redirectBasedOnRole(user.role);
    }
    
    // Login form handler
    document.getElementById('loginForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        try {
            // Create FormData object
            const formData = new FormData();
            formData.append('operation', 'login');
            formData.append('json', JSON.stringify({ email, password }));

            const response = await axios.post('api/user.php', formData);

            if (response.data.status === 'success' && response.data.data) {
                // Save user data to localStorage
                localStorage.setItem('user', JSON.stringify(response.data.data));
                
                // Show success message
                showAlert('success', 'Login successful! Redirecting...');
                
                // Redirect based on role
                setTimeout(() => {
                    redirectBasedOnRole(response.data.data.role);
                }, 1000);
            } else {
                showAlert('danger', response.data.message || 'Invalid credentials');
            }
        } catch (error) {
            console.error('Login error:', error);
            showAlert('danger', 'Login failed: ' + (error.response?.data?.message || 'Server error'));
        }
    });
    
    // Registration form handler
    document.getElementById('registerForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const name = document.getElementById('reg-name').value;
        const email = document.getElementById('reg-email').value;
        const password = document.getElementById('reg-password').value;
        const confirmPassword = document.getElementById('reg-confirm-password').value;
        
        // Validate password match
        if (password !== confirmPassword) {
            showAlert('danger', 'Passwords do not match');
            return;
        }
        
        try {
            // Create FormData object
            const formData = new FormData();
            formData.append('operation', 'register');
            formData.append('json', JSON.stringify({ name, email, password }));

            const response = await axios.post('api/user.php', formData);

            if (response.data.status === 'success') {
                showAlert('success', response.data.message);
                
                // Switch to login tab after successful registration
                setTimeout(() => {
                    document.getElementById('login-tab').click();
                    
                    // Pre-fill email field
                    document.getElementById('email').value = email;
                }, 1500);
            } else {
                showAlert('danger', response.data.message || 'Registration failed');
            }
        } catch (error) {
            console.error('Registration error:', error);
            showAlert('danger', 'Registration failed: ' + (error.response?.data?.message || 'Server error'));
        }
    });
});

// Helper function to show alerts
function showAlert(type, message) {
    // Remove any existing alerts
    const existingAlerts = document.querySelectorAll('.alert');
    existingAlerts.forEach(alert => alert.remove());
    
    // Create new alert
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
    alertDiv.role = 'alert';
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;
    
    // Find active form to append alert to
    const activePane = document.querySelector('.tab-pane.active');
    if (activePane) {
        activePane.insertBefore(alertDiv, activePane.firstChild);
    }
    
    // Auto dismiss after 5 seconds
    setTimeout(() => {
        const alertToRemove = document.querySelector('.alert');
        if (alertToRemove) {
            const bsAlert = new bootstrap.Alert(alertToRemove);
            bsAlert.close();
        }
    }, 5000);
}

// Helper function to redirect based on user role
function redirectBasedOnRole(role) {
    switch(role) {
        case 'admin':
            window.location.href = 'admin/dashboard.html';
            break;
        case 'parent':
            window.location.href = 'parent/dashboard.html';
            break;
        default:
            console.error('Unknown role:', role);
            localStorage.removeItem('user');
            showAlert('danger', 'Invalid user role. Please log in again.');
    }
} 