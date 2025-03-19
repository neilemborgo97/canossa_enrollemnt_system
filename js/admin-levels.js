document.addEventListener('DOMContentLoaded', function() {
    // Load levels when page loads
    loadLevels();

    // Add level form handler
    document.getElementById('saveLevelBtn').addEventListener('click', function() {
        const form = document.getElementById('addLevelForm');
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());
        
        addLevel(data);
    });

    // Update level form handler
    document.getElementById('updateLevelBtn').addEventListener('click', function() {
        const form = document.getElementById('editLevelForm');
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());
        
        updateLevel(data);
    });

    // Logout handler
    document.getElementById('logoutBtn').addEventListener('click', function(e) {
        e.preventDefault();
        logout();
    });
});

// Load all levels
function loadLevels() {
    axios.get('api/level.php?action=getAllLevels')
        .then(function(response) {
            if (response.data.status === 'success') {
                displayLevels(response.data.data);
            } else {
                showAlert('Error loading levels: ' + response.data.message, 'danger');
            }
        })
        .catch(function(error) {
            showAlert('Error loading levels: ' + error.message, 'danger');
        });
}

// Display levels in table
function displayLevels(levels) {
    const tbody = document.getElementById('levelsTableBody');
    tbody.innerHTML = '';

    levels.forEach(level => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${level.name}</td>
            <td>${level.description || ''}</td>
            <td>
                <span class="badge ${level.status === 'active' ? 'bg-success' : 'bg-danger'}">
                    ${level.status}
                </span>
            </td>
            <td>
                <button class="btn btn-sm btn-primary me-1" onclick="loadLevelForEdit(${level.id})">
                    <i class="bi bi-pencil"></i>
                </button>
                <button class="btn btn-sm btn-danger" onclick="deleteLevel(${level.id})">
                    <i class="bi bi-trash"></i>
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// Load level data for editing
function loadLevelForEdit(id) {
    axios.get(`api/level.php?action=getLevelById&id=${id}`)
        .then(function(response) {
            if (response.data.status === 'success') {
                const level = response.data.data;
                const form = document.getElementById('editLevelForm');
                
                form.querySelector('[name="id"]').value = level.id;
                form.querySelector('[name="name"]').value = level.name;
                form.querySelector('[name="description"]').value = level.description || '';
                form.querySelector('[name="status"]').value = level.status;

                new bootstrap.Modal(document.getElementById('editLevelModal')).show();
            } else {
                showAlert('Error loading level: ' + response.data.message, 'danger');
            }
        })
        .catch(function(error) {
            showAlert('Error loading level: ' + error.message, 'danger');
        });
}

// Add new level
function addLevel(data) {
    axios.post('api/level.php?action=addLevel', data)
        .then(function(response) {
            if (response.data.status === 'success') {
                showAlert('Level added successfully', 'success');
                bootstrap.Modal.getInstance(document.getElementById('addLevelModal')).hide();
                document.getElementById('addLevelForm').reset();
                loadLevels();
            } else {
                showAlert('Error adding level: ' + response.data.message, 'danger');
            }
        })
        .catch(function(error) {
            showAlert('Error adding level: ' + error.message, 'danger');
        });
}

// Update level
function updateLevel(data) {
    axios.post('api/level.php?action=updateLevel', data)
        .then(function(response) {
            if (response.data.status === 'success') {
                showAlert('Level updated successfully', 'success');
                bootstrap.Modal.getInstance(document.getElementById('editLevelModal')).hide();
                loadLevels();
            } else {
                showAlert('Error updating level: ' + response.data.message, 'danger');
            }
        })
        .catch(function(error) {
            showAlert('Error updating level: ' + error.message, 'danger');
        });
}

// Delete level
function deleteLevel(id) {
    if (confirm('Are you sure you want to delete this level?')) {
        axios.post('api/level.php?action=deleteLevel', { id: id })
            .then(function(response) {
                if (response.data.status === 'success') {
                    showAlert('Level deleted successfully', 'success');
                    loadLevels();
                } else {
                    showAlert('Error deleting level: ' + response.data.message, 'danger');
                }
            })
            .catch(function(error) {
                showAlert('Error deleting level: ' + error.message, 'danger');
            });
    }
}

// Show alert message
function showAlert(message, type) {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
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

// Logout function
function logout() {
    localStorage.removeItem('user');
    window.location.href = '../login.html';
} 