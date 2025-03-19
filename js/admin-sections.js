document.addEventListener('DOMContentLoaded', function() {
    // Load sections and dropdown data when page loads
    loadSections();
    loadLevels();
    loadTeachers();

    // Add Section Form Handler
    document.getElementById('saveSectionBtn').addEventListener('click', function() {
        const sectionData = {
            name: document.getElementById('sectionName').value,
            level_id: document.getElementById('sectionLevel').value,
            teacher_id: document.getElementById('sectionTeacher').value,
            schedule: document.getElementById('sectionSchedule').value,
            capacity: document.getElementById('sectionCapacity').value,
            status: document.getElementById('sectionStatus').value
        };

        addSection(sectionData);
    });

    // Edit Section Form Handler
    document.getElementById('updateSectionBtn').addEventListener('click', function() {
        const sectionId = document.getElementById('editSectionId').value;
        const sectionData = {
            id: sectionId,
            name: document.getElementById('editSectionName').value,
            level_id: document.getElementById('editSectionLevel').value,
            teacher_id: document.getElementById('editSectionTeacher').value,
            schedule: document.getElementById('editSectionSchedule').value,
            capacity: document.getElementById('editSectionCapacity').value,
            status: document.getElementById('editSectionStatus').value
        };

        updateSection(sectionData);
    });

    // Logout Handler
    document.getElementById('logoutBtn').addEventListener('click', function(e) {
        e.preventDefault();
        logout();
    });
});

// Function to load all sections
function loadSections() {
    console.log('Loading sections...');
    const formData = new FormData();
    formData.append('operation', 'getAllSections');
    
    axios.post('../api/section.php', formData)
        .then(response => {
            console.log('API Response:', response);
            if (response.data.status === 'success') {
                console.log('Sections data received:', response.data.data);
                if (!response.data.data || response.data.data.length === 0) {
                    console.log('No sections data available');
                    showAlert('No sections found', 'info');
                    return;
                }
                displaySections(response.data.data);
            } else {
                console.error('API Error:', response.data.message);
                showAlert('Error loading sections: ' + response.data.message, 'danger');
            }
        })
        .catch(error => {
            console.error('API Call Failed:', error);
            console.error('Error Details:', {
                message: error.message,
                response: error.response,
                request: error.request
            });
            showAlert('Error loading sections: ' + error.message, 'danger');
        });
}

// Function to load levels for dropdowns
function loadLevels() {
    console.log('Loading levels...');
    // You might need to create a level.php API endpoint, or you can use other methods to get levels
    // For now, let's hardcode the levels from the database (based on canossa_enrollment SQL)
    
    const levels = [
        { id: 1, name: "Nursery" },
        { id: 2, name: "Pre-Kindergarten" },
        { id: 3, name: "Kindergarten 1" },
        { id: 4, name: "Kindergarten 2" }
    ];
    
    const levelSelects = [
        document.getElementById('sectionLevel'),
        document.getElementById('editSectionLevel')
    ];

    levelSelects.forEach(select => {
        select.innerHTML = '<option value="">Select Level</option>';
        levels.forEach(level => {
            select.innerHTML += `<option value="${level.id}">${level.name}</option>`;
        });
    });
    
    console.log('Levels loaded:', levels);
}

// Function to load teachers for dropdowns
function loadTeachers() {
    console.log('Loading teachers...');
    const formData = new FormData();
    formData.append('operation', 'getAllTeachers');
    
    axios.post('../api/teacher.php', formData)
        .then(response => {
            console.log('API Response:', response);
            if (response.data.status === 'success') {
                console.log('Teachers data received:', response.data.data);
                const teachers = response.data.data;
                const teacherSelects = [
                    document.getElementById('sectionTeacher'),
                    document.getElementById('editSectionTeacher')
                ];

                teacherSelects.forEach(select => {
                    select.innerHTML = '<option value="">Select Teacher</option>';
                    teachers.forEach(teacher => {
                        if (teacher.status === 'active') {
                            select.innerHTML += `<option value="${teacher.id}">${teacher.name}</option>`;
                        }
                    });
                });
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

// Function to display sections in the table
function displaySections(sections) {
    console.log('Displaying sections:', sections);
    const tbody = document.getElementById('sectionsTableBody');
    tbody.innerHTML = '';

    if (!Array.isArray(sections)) {
        console.error('Sections data is not an array:', sections);
        return;
    }

    sections.forEach(section => {
        console.log('Processing section:', section);
        
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${section.section_name || '-'}</td>
            <td>${section.level_name || '-'}</td>
            <td>${section.teacher_name || '-'}</td>
            <td>${section.schedule === 'morning' ? 'Morning (7:00 AM - 12:00 PM)' : 'Afternoon (1:00 PM - 6:00 PM)'}</td>
            <td>${section.max_capacity || 30}</td>
            <td>${section.enrolled_count || 0}</td>
            <td>
                <span class="badge ${section.status === 'active' ? 'bg-success' : 'bg-danger'} status-badge">
                    ${section.status || 'active'}
                </span>
            </td>
            <td>
                <button class="btn btn-sm btn-primary edit-section" data-id="${section.id}">
                    <i class="bi bi-pencil"></i>
                </button>
                <button class="btn btn-sm btn-danger delete-section" data-id="${section.id}">
                    <i class="bi bi-trash"></i>
                </button>
            </td>
        `;
        tbody.appendChild(tr);
        
        // Add event listeners directly to the buttons in this row
        const editButton = tr.querySelector('.edit-section');
        const deleteButton = tr.querySelector('.delete-section');
        
        editButton.addEventListener('click', function() {
            const sectionId = this.getAttribute('data-id');
            if (!sectionId) {
                console.error('Cannot edit section: No ID available');
                showAlert('Cannot edit section: No ID available', 'danger');
                return;
            }
            console.log('Edit button clicked for section ID:', sectionId);
            loadSectionForEdit(sectionId);
        });
        
        deleteButton.addEventListener('click', function() {
            const sectionId = this.getAttribute('data-id');
            if (!sectionId) {
                console.error('Cannot delete section: No ID available');
                showAlert('Cannot delete section: No ID available', 'danger');
                return;
            }
            console.log('Delete button clicked for section ID:', sectionId);
            if (confirm(`Are you sure you want to delete section ${section.section_name}?`)) {
                deleteSection(sectionId);
            }
        });
    });

    console.log('Finished displaying sections. Table contents:', tbody.innerHTML);
}

// Function to load section data for editing
function loadSectionForEdit(sectionId) {
    console.log('Loading section for edit, ID:', sectionId);
    const formData = new FormData();
    formData.append('operation', 'getSectionById');
    formData.append('id', sectionId);
    
    axios.post('../api/section.php', formData)
        .then(response => {
            console.log('Edit section response:', response);
            if (response.data.status === 'success') {
                const section = response.data.data;
                document.getElementById('editSectionId').value = section.id;
                document.getElementById('editSectionName').value = section.section_name;
                document.getElementById('editSectionLevel').value = section.level_id;
                document.getElementById('editSectionTeacher').value = section.teacher_id || '';
                document.getElementById('editSectionSchedule').value = section.schedule || 'morning';
                document.getElementById('editSectionCapacity').value = section.max_capacity || 30;
                document.getElementById('editSectionStatus').value = section.status || 'active';

                // Show the edit modal
                const editModal = new bootstrap.Modal(document.getElementById('editSectionModal'));
                editModal.show();
            } else {
                showAlert('Error loading section data: ' + response.data.message, 'danger');
            }
        })
        .catch(error => {
            console.error('Error loading section data:', error);
            showAlert('Error loading section data: ' + error.message, 'danger');
        });
}

// Function to add a new section
function addSection(sectionData) {
    console.log('Adding section:', sectionData);
    // Format data for API
    const apiData = {
        section_name: sectionData.name,
        level_id: sectionData.level_id,
        teacher_id: sectionData.teacher_id,
        schedule: sectionData.schedule,
        max_capacity: sectionData.capacity,
        status: sectionData.status
    };
    
    console.log('API data being sent:', apiData);
    
    const formData = new FormData();
    formData.append('operation', 'addSection');
    formData.append('json', JSON.stringify(apiData));
    
    axios.post('../api/section.php', formData)
        .then(response => {
            console.log('Add section response:', response);
            if (response.data.status === 'success') {
                showAlert('Section added successfully', 'success');
                // Close the modal and reload sections
                const addModal = bootstrap.Modal.getInstance(document.getElementById('addSectionModal'));
                addModal.hide();
                document.getElementById('addSectionForm').reset();
                loadSections();
            } else {
                showAlert('Error adding section: ' + response.data.message, 'danger');
            }
        })
        .catch(error => {
            console.error('Error adding section:', error);
            showAlert('Error adding section: ' + error.message, 'danger');
        });
}

// Function to update a section
function updateSection(sectionData) {
    console.log('Updating section:', sectionData);
    // Format data for API
    const apiData = {
        id: sectionData.id,
        section_name: sectionData.name,
        level_id: sectionData.level_id,
        teacher_id: sectionData.teacher_id,
        schedule: sectionData.schedule,
        max_capacity: sectionData.capacity,
        status: sectionData.status
    };
    
    console.log('API data being sent for update:', apiData);
    
    const formData = new FormData();
    formData.append('operation', 'updateSection');
    formData.append('json', JSON.stringify(apiData));
    
    axios.post('../api/section.php', formData)
        .then(response => {
            console.log('Update section response:', response);
            if (response.data.status === 'success') {
                showAlert('Section updated successfully', 'success');
                // Close the modal and reload sections
                const editModal = bootstrap.Modal.getInstance(document.getElementById('editSectionModal'));
                editModal.hide();
                loadSections();
            } else {
                showAlert('Error updating section: ' + response.data.message, 'danger');
            }
        })
        .catch(error => {
            console.error('Error updating section:', error);
            showAlert('Error updating section: ' + error.message, 'danger');
        });
}

// Function to delete a section
function deleteSection(sectionId) {
    if (!sectionId) {
        console.error('Invalid section ID for deletion:', sectionId);
        showAlert('Error: Invalid section ID', 'danger');
        return;
    }
    
    console.log('Deleting section ID:', sectionId);
    const formData = new FormData();
    formData.append('operation', 'deleteSection');
    formData.append('id', sectionId);
    
    axios.post('../api/section.php', formData)
        .then(response => {
            console.log('Delete section response:', response);
            if (response.data.status === 'success') {
                showAlert('Section deleted successfully', 'success');
                loadSections();
            } else {
                showAlert('Error deleting section: ' + response.data.message, 'danger');
            }
        })
        .catch(error => {
            console.error('Error deleting section:', error);
            showAlert('Error deleting section: ' + error.message, 'danger');
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