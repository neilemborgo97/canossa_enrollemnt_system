document.addEventListener('DOMContentLoaded', function() {
    // Load teachers when page loads
    loadTeachers();

    // Add Teacher Form Handler
    document.getElementById('saveTeacherBtn').addEventListener('click', function() {
        const teacherData = {
            name: document.getElementById('teacherName').value,
            email: document.getElementById('teacherEmail').value,
            phone: document.getElementById('teacherPhone').value,
            specialization: document.getElementById('teacherSpecialization').value,
            qualification: document.getElementById('teacherQualification').value,
            status: document.getElementById('teacherStatus').value
        };

        addTeacher(teacherData);
    });

    // Edit Teacher Form Handler
    document.getElementById('updateTeacherBtn').addEventListener('click', function() {
        const teacherId = document.getElementById('editTeacherId').value;
        const teacherData = {
            id: teacherId,
            name: document.getElementById('editTeacherName').value,
            email: document.getElementById('editTeacherEmail').value,
            phone: document.getElementById('editTeacherPhone').value,
            specialization: document.getElementById('editTeacherSpecialization').value,
            qualification: document.getElementById('editTeacherQualification').value,
            status: document.getElementById('editTeacherStatus').value
        };

        updateTeacher(teacherData);
    });

    // Logout Handler
    document.getElementById('logoutBtn').addEventListener('click', function(e) {
        e.preventDefault();
        logout();
    });
});

// Function to load all teachers
function loadTeachers() {
    console.log('Loading teachers...');
    const formData = new FormData();
    formData.append('operation', 'getAllTeachers');
    
    console.log('Making API call to teacher.php with operation:', formData.get('operation'));
    
    axios.post('../api/teacher.php', formData)
        .then(response => {
            console.log('API Response:', response);
            if (response.data.status === 'success') {
                console.log('Teachers data received:', response.data.data);
                displayTeachers(response.data.data);
            } else {
                console.error('API Error:', response.data.message);
                showAlert('Error loading teachers: ' + response.data.message, 'danger');
            }
        })
        .catch(error => {
            console.error('API Call Failed:', error);
            console.error('Error Details:', {
                message: error.message,
                response: error.response,
                request: error.request
            });
            showAlert('Error loading teachers: ' + error.message, 'danger');
        });
}

// Function to display teachers in the table
function displayTeachers(teachers) {
    console.log('Displaying teachers:', teachers);
    const tbody = document.getElementById('teachersTableBody');
    console.log('Table body element:', tbody);
    tbody.innerHTML = '';

    if (!Array.isArray(teachers)) {
        console.error('Teachers data is not an array:', teachers);
        return;
    }

    teachers.forEach(teacher => {
        console.log('Processing teacher:', teacher);
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${teacher.name}</td>
            <td>${teacher.email}</td>
            <td>${teacher.phone || '-'}</td>
            <td>${teacher.specialization || '-'}</td>
            <td>${teacher.qualification || '-'}</td>
            <td>
                <span class="badge ${teacher.status === 'active' ? 'bg-success' : 'bg-danger'} status-badge">
                    ${teacher.status}
                </span>
            </td>
            <td>
                <button class="btn btn-sm btn-primary edit-teacher" data-id="${teacher.id}">
                    <i class="bi bi-pencil"></i>
                </button>
                <button class="btn btn-sm btn-danger delete-teacher" data-id="${teacher.id}">
                    <i class="bi bi-trash"></i>
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });

    console.log('Finished displaying teachers. Table contents:', tbody.innerHTML);

    // Add event listeners to edit buttons
    document.querySelectorAll('.edit-teacher').forEach(button => {
        button.addEventListener('click', function() {
            const teacherId = this.dataset.id;
            loadTeacherForEdit(teacherId);
        });
    });

    // Add event listeners to delete buttons
    document.querySelectorAll('.delete-teacher').forEach(button => {
        button.addEventListener('click', function() {
            const teacherId = this.dataset.id;
            if (confirm('Are you sure you want to delete this teacher?')) {
                deleteTeacher(teacherId);
            }
        });
    });
}

// Function to load teacher data for editing
function loadTeacherForEdit(teacherId) {
    const formData = new FormData();
    formData.append('operation', 'getTeacherById');
    formData.append('id', teacherId);
    
    axios.post('../api/teacher.php', formData)
        .then(response => {
            if (response.data.status === 'success') {
                const teacher = response.data.data;
                document.getElementById('editTeacherId').value = teacher.id;
                document.getElementById('editTeacherName').value = teacher.name;
                document.getElementById('editTeacherEmail').value = teacher.email;
                document.getElementById('editTeacherPhone').value = teacher.phone || '';
                document.getElementById('editTeacherSpecialization').value = teacher.specialization || '';
                document.getElementById('editTeacherQualification').value = teacher.qualification || '';
                document.getElementById('editTeacherStatus').value = teacher.status;

                // Show the edit modal
                const editModal = new bootstrap.Modal(document.getElementById('editTeacherModal'));
                editModal.show();
            } else {
                showAlert('Error loading teacher data: ' + response.data.message, 'danger');
            }
        })
        .catch(error => {
            showAlert('Error loading teacher data: ' + error.message, 'danger');
        });
}

// Function to add a new teacher
function addTeacher(teacherData) {
    const formData = new FormData();
    formData.append('operation', 'addTeacher');
    formData.append('json', JSON.stringify(teacherData));
    
    axios.post('../api/teacher.php', formData)
        .then(response => {
            if (response.data.status === 'success') {
                showAlert('Teacher added successfully', 'success');
                // Close the modal and reload teachers
                const addModal = bootstrap.Modal.getInstance(document.getElementById('addTeacherModal'));
                addModal.hide();
                document.getElementById('addTeacherForm').reset();
                loadTeachers();
            } else {
                showAlert('Error adding teacher: ' + response.data.message, 'danger');
            }
        })
        .catch(error => {
            showAlert('Error adding teacher: ' + error.message, 'danger');
        });
}

// Function to update a teacher
function updateTeacher(teacherData) {
    const formData = new FormData();
    formData.append('operation', 'updateTeacher');
    formData.append('json', JSON.stringify(teacherData));
    
    axios.post('../api/teacher.php', formData)
        .then(response => {
            if (response.data.status === 'success') {
                showAlert('Teacher updated successfully', 'success');
                // Close the modal and reload teachers
                const editModal = bootstrap.Modal.getInstance(document.getElementById('editTeacherModal'));
                editModal.hide();
                loadTeachers();
            } else {
                showAlert('Error updating teacher: ' + response.data.message, 'danger');
            }
        })
        .catch(error => {
            showAlert('Error updating teacher: ' + error.message, 'danger');
        });
}

// Function to delete a teacher
function deleteTeacher(teacherId) {
    const formData = new FormData();
    formData.append('operation', 'deleteTeacher');
    formData.append('id', teacherId);
    
    axios.post('../api/teacher.php', formData)
        .then(response => {
            if (response.data.status === 'success') {
                showAlert('Teacher deleted successfully', 'success');
                loadTeachers();
            } else {
                showAlert('Error deleting teacher: ' + response.data.message, 'danger');
            }
        })
        .catch(error => {
            showAlert('Error deleting teacher: ' + error.message, 'danger');
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