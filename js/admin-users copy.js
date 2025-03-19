document.addEventListener('DOMContentLoaded', function() {
    // Load users when page loads
    loadUsers();

    // Add User Form Handler
    document.getElementById('saveUserBtn').addEventListener('click', function() {
        const userData = {
            name: document.getElementById('userName').value,
            email: document.getElementById('userEmail').value,
            password: document.getElementById('userPassword').value,
            role: document.getElementById('userRole').value,
            status: document.getElementById('userStatus').value
        };

        addUser(userData);
    });

    // Edit User Form Handler
    document.getElementById('updateUserBtn').addEventListener('click', function() {
        const userId = document.getElementById('editUserId').value;
        const userData = {
            id: userId,
            name: document.getElementById('editUserName').value,
            email: document.getElementById('editUserEmail').value,
            password: document.getElementById('editUserPassword').value,
            role: document.getElementById('editUserRole').value,
            status: document.getElementById('editUserStatus').value
        };

        updateUser(userData);
    });

    // Logout Handler
    document.getElementById('logoutBtn').addEventListener('click', function(e) {
        e.preventDefault();
        logout();
    });
});

// Function to load all users
function loadUsers() {
    axios.get('../api/user.php?action=getAllUsers')
        .then(response => {
            if (response.data.status === 'success') {
                displayUsers(response.data.data);
            } else {
                showAlert('Error loading users: ' + response.data.message, 'danger');
            }
        })
        .catch(error => {
            showAlert('Error loading users: ' + error.message, 'danger');
        });
}

// Function to display users in the table
function displayUsers(users) {
    const tbody = document.getElementById('usersTableBody');
    tbody.innerHTML = '';

    users.forEach(user => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${user.name}</td>
            <td>${user.email}</td>
            <td>${user.role.charAt(0).toUpperCase() + user.role.slice(1)}</td>
            <td>${new Date(user.created_at).toLocaleDateString()}</td>
            <td>
                <span class="badge ${user.status === 'active' ? 'bg-success' : 'bg-danger'} status-badge">
                    ${user.status}
                </span>
            </td>
            <td>
                <button class="btn btn-sm btn-primary edit-user" data-id="${user.id}">
                    <i class="bi bi-pencil"></i>
                </button>
                <button class="btn btn-sm btn-danger delete-user" data-id="${user.id}">
                    <i class="bi bi-trash"></i>
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });

    // Add event listeners to edit buttons
    document.querySelectorAll('.edit-user').forEach(button => {
        button.addEventListener('click', function() {
            const userId = this.dataset.id;
            loadUserForEdit(userId);
        });
    });

    // Add event listeners to delete buttons
    document.querySelectorAll('.delete-user').forEach(button => {
        button.addEventListener('click', function() {
            const userId = this.dataset.id;
            if (confirm('Are you sure you want to delete this user?')) {
                deleteUser(userId);
            }
        });
    });
}

// Function to load user data for editing
function loadUserForEdit(userId) {
    axios.get(`../api/user.php?action=getUserById&id=${userId}`)
        .then(response => {
            if (response.data.status === 'success') {
                const user = response.data.data;
                document.getElementById('editUserId').value = user.id;
                document.getElementById('editUserName').value = user.name;
                document.getElementById('editUserEmail').value = user.email;
                document.getElementById('editUserPassword').value = ''; // Clear password field
                document.getElementById('editUserRole').value = user.role;
                document.getElementById('editUserStatus').value = user.status;

                // Show the edit modal
                const editModal = new bootstrap.Modal(document.getElementById('editUserModal'));
                editModal.show();
            } else {
                showAlert('Error loading user data: ' + response.data.message, 'danger');
            }
        })
        .catch(error => {
            showAlert('Error loading user data: ' + error.message, 'danger');
        });
}

// Function to add a new user
function addUser(userData) {
    axios.post('../api/user.php?action=addUser', userData)
        .then(response => {
            if (response.data.status === 'success') {
                showAlert('User added successfully', 'success');
                // Close the modal and reload users
                const addModal = bootstrap.Modal.getInstance(document.getElementById('addUserModal'));
                addModal.hide();
                document.getElementById('addUserForm').reset();
                loadUsers();
            } else {
                showAlert('Error adding user: ' + response.data.message, 'danger');
            }
        })
        .catch(error => {
            showAlert('Error adding user: ' + error.message, 'danger');
        });
}

// Function to update a user
function updateUser(userData) {
    // If password is empty, remove it from the data
    if (!userData.password) {
        delete userData.password;
    }

    axios.post('../api/user.php?action=updateUser', userData)
        .then(response => {
            if (response.data.status === 'success') {
                showAlert('User updated successfully', 'success');
                // Close the modal and reload users
                const editModal = bootstrap.Modal.getInstance(document.getElementById('editUserModal'));
                editModal.hide();
                loadUsers();
            } else {
                showAlert('Error updating user: ' + response.data.message, 'danger');
            }
        })
        .catch(error => {
            showAlert('Error updating user: ' + error.message, 'danger');
        });
}

// Function to delete a user
function deleteUser(userId) {
    axios.post('../api/user.php?action=deleteUser', { id: userId })
        .then(response => {
            if (response.data.status === 'success') {
                showAlert('User deleted successfully', 'success');
                loadUsers();
            } else {
                showAlert('Error deleting user: ' + response.data.message, 'danger');
            }
        })
        .catch(error => {
            showAlert('Error deleting user: ' + error.message, 'danger');
        });
}

// Function to show alerts
function showAlert(message, type) {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show position-fixed top-0 end-0 m-3`;
    alertDiv.style.zIndex = '9999';
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    document.body.appendChild(alertDiv);

    // Auto dismiss after 5 seconds
    setTimeout(() => {
        alertDiv.remove();
    }, 5000);
}

// Function to handle logout
function logout() {
    localStorage.removeItem('user');
    window.location.href = '../login.html';
} 