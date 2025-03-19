document.addEventListener('DOMContentLoaded', function() {
    // Load data
    loadStudents();
    loadLevels();

    // Filter by level (will enable section dropdown and load sections)
    document.getElementById('filterLevel').addEventListener('change', function() {
        const levelId = this.value;
        const sectionSelect = document.getElementById('filterSection');
        
        if (levelId) {
            sectionSelect.disabled = false;
            loadSectionsByLevel(levelId);
        } else {
            sectionSelect.disabled = true;
            sectionSelect.innerHTML = '<option value="">Select Level First</option>';
            // Reload all students when level filter is cleared
            loadStudents();
        }
    });

    // Filter by section
    document.getElementById('filterSection').addEventListener('change', function() {
        filterStudents();
    });

    // Filter by status
    document.getElementById('filterStatus').addEventListener('change', function() {
        filterStudents();
    });

    // Search students
    document.getElementById('searchStudent').addEventListener('input', function() {
        filterStudents();
    });

    // Assign section button
    document.getElementById('assignSectionBtn').addEventListener('click', function() {
        const studentId = document.getElementById('studentId').value;
        const sectionId = document.getElementById('assignSection').value;
        
        if (!sectionId) {
            showAlert('Please select a section', 'warning');
            return;
        }
        
        assignStudentToSection(studentId, sectionId);
    });

    // Remove from section button
    document.getElementById('removeFromSectionBtn').addEventListener('click', function() {
        const studentId = document.getElementById('studentId').value;
        removeStudentFromSection(studentId);
    });

    // Logout Handler
    document.getElementById('logoutBtn').addEventListener('click', function(e) {
        e.preventDefault();
        logout();
    });
});

// Function to load all students
function loadStudents() {
    console.log('Loading students...');
    const formData = new FormData();
    formData.append('operation', 'getAllEnrolledStudents');
    
    axios.post('../api/student.php', formData)
        .then(response => {
            console.log('API Response:', response);
            if (response.data.status === 'success') {
                console.log('Students data received:', response.data.data);
                displayStudents(response.data.data);
            } else {
                console.error('API Error:', response.data.message);
                showAlert('Error loading students: ' + response.data.message, 'danger');
            }
        })
        .catch(error => {
            console.error('API Call Failed:', error);
            console.error('Error Details:', {
                message: error.message,
                response: error.response,
                request: error.request
            });
            showAlert('Error loading students: ' + error.message, 'danger');
        });
}

// Function to load levels for dropdown
function loadLevels() {
    console.log('Loading levels...');
    // Using hardcoded levels as in the sections.js
    const levels = [
        { id: 1, name: "Nursery" },
        { id: 2, name: "Pre-Kindergarten" },
        { id: 3, name: "Kindergarten 1" },
        { id: 4, name: "Kindergarten 2" }
    ];
    
    const levelSelect = document.getElementById('filterLevel');
    
    levelSelect.innerHTML = '<option value="">All Levels</option>';
    levels.forEach(level => {
        levelSelect.innerHTML += `<option value="${level.id}">${level.name}</option>`;
    });
    
    console.log('Levels loaded:', levels);
}

// Function to load sections by level
function loadSectionsByLevel(levelId) {
    console.log('Loading sections for level:', levelId);
    const formData = new FormData();
    formData.append('operation', 'getSectionsByLevel');
    formData.append('level_id', levelId);
    
    axios.post('../api/section.php', formData)
        .then(response => {
            console.log('Sections API Response:', response);
            if (response.data.status === 'success') {
                const sections = response.data.data;
                const sectionSelect = document.getElementById('filterSection');
                
                sectionSelect.innerHTML = '<option value="">All Sections</option>';
                sections.forEach(section => {
                    sectionSelect.innerHTML += `<option value="${section.id}">${section.section_name}</option>`;
                });
                
                // Enable filtering now that sections are loaded
                filterStudents();
            } else {
                console.error('Sections API Error:', response.data.message);
            }
        })
        .catch(error => {
            console.error('Sections API Call Failed:', error);
        });
}

// Function to load sections for assignment (in modal)
function loadSectionsForAssignment(levelId, schedule) {
    console.log(`Loading sections for assignment (Level: ${levelId}, Schedule: ${schedule})`);
    const formData = new FormData();
    formData.append('operation', 'getSectionsByLevel');
    formData.append('level_id', levelId);
    
    axios.post('../api/section.php', formData)
        .then(response => {
            console.log('Sections for Assignment API Response:', response);
            if (response.data.status === 'success') {
                const sections = response.data.data;
                const sectionSelect = document.getElementById('assignSection');
                
                sectionSelect.innerHTML = '<option value="">Select Section</option>';
                sections.forEach(section => {
                    // Only show sections that match the schedule or have 'both' schedule
                    if (section.schedule === schedule || section.schedule === 'both') {
                        sectionSelect.innerHTML += `<option value="${section.id}">${section.section_name}</option>`;
                    }
                });
            } else {
                console.error('Sections API Error:', response.data.message);
            }
        })
        .catch(error => {
            console.error('Sections API Call Failed:', error);
        });
}

// Function to display students in table
function displayStudents(students) {
    const tbody = document.getElementById('studentsTableBody');
    tbody.innerHTML = '';

    if (!students || students.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center">No students found</td></tr>`;
        return;
    }

    students.forEach(student => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${student.name}</td>
            <td>${student.parent_name || '-'}</td>
            <td>${student.level_name || '-'}</td>
            <td>${student.schedule === 'morning' ? 'Morning' : 'Afternoon'}</td>
            <td>${student.section_name || '<span class="text-danger">Not Assigned</span>'}</td>
            <td>
                <button class="btn btn-sm btn-primary assign-section" data-id="${student.id}">
                    <i class="bi bi-pencil"></i> Assign
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });

    // Add event listeners to assign buttons
    document.querySelectorAll('.assign-section').forEach(button => {
        button.addEventListener('click', function() {
            const studentId = this.dataset.id;
            openAssignSectionModal(studentId, students);
        });
    });
}

// Function to open assign section modal
function openAssignSectionModal(studentId, students) {
    const student = students.find(s => s.id == studentId);
    if (!student) return;
    
    document.getElementById('studentId').value = student.id;
    document.getElementById('studentName').textContent = student.name;
    document.getElementById('studentLevel').textContent = student.level_name || '-';
    document.getElementById('studentSchedule').textContent = student.schedule === 'morning' ? 'Morning' : 'Afternoon';
    
    // Load available sections for this student's level and schedule
    loadSectionsForAssignment(student.level_id, student.schedule);
    
    // Show/hide remove button based on whether student is already assigned to a section
    const removeBtn = document.getElementById('removeFromSectionBtn');
    if (student.section_id) {
        removeBtn.style.display = 'inline-block';
    } else {
        removeBtn.style.display = 'none';
    }
    
    // Show the modal
    const modal = new bootstrap.Modal(document.getElementById('assignSectionModal'));
    modal.show();
}

// Function to assign student to section
function assignStudentToSection(studentId, sectionId) {
    console.log(`Assigning student ${studentId} to section ${sectionId}`);
    const formData = new FormData();
    formData.append('operation', 'enlistStudent');
    formData.append('json', JSON.stringify({
        student_id: studentId,
        section_id: sectionId
    }));
    
    axios.post('../api/student.php', formData)
        .then(response => {
            console.log('Assign Section API Response:', response);
            if (response.data.status === 'success') {
                showAlert('Student successfully assigned to section', 'success');
                // Close the modal
                const modal = bootstrap.Modal.getInstance(document.getElementById('assignSectionModal'));
                modal.hide();
                // Reload students
                loadStudents();
            } else {
                showAlert('Error assigning student: ' + response.data.message, 'danger');
            }
        })
        .catch(error => {
            console.error('Assign Section API Call Failed:', error);
            showAlert('Error assigning student: ' + error.message, 'danger');
        });
}

// Function to remove student from section
function removeStudentFromSection(studentId) {
    console.log(`Removing student ${studentId} from section`);
    const formData = new FormData();
    formData.append('operation', 'removeFromSection');
    formData.append('student_id', studentId);
    
    axios.post('../api/student.php', formData)
        .then(response => {
            console.log('Remove from Section API Response:', response);
            if (response.data.status === 'success') {
                showAlert('Student successfully removed from section', 'success');
                // Close the modal
                const modal = bootstrap.Modal.getInstance(document.getElementById('assignSectionModal'));
                modal.hide();
                // Reload students
                loadStudents();
            } else {
                showAlert('Error removing student: ' + response.data.message, 'danger');
            }
        })
        .catch(error => {
            console.error('Remove from Section API Call Failed:', error);
            showAlert('Error removing student: ' + error.message, 'danger');
        });
}

// Function to filter students based on selected filters
function filterStudents() {
    const levelId = document.getElementById('filterLevel').value;
    const sectionId = document.getElementById('filterSection').value;
    const status = document.getElementById('filterStatus').value;
    const searchText = document.getElementById('searchStudent').value.toLowerCase();
    
    console.log(`Filtering students - Level: ${levelId}, Section: ${sectionId}, Status: ${status}, Search: ${searchText}`);
    
    // Get all student rows
    const rows = document.querySelectorAll('#studentsTableBody tr');
    
    rows.forEach(row => {
        let shouldShow = true;
        
        // Get the student data from the row
        const studentName = row.cells[0].textContent.toLowerCase();
        const levelName = row.cells[2].textContent;
        const sectionCell = row.cells[4].textContent;
        const isAssigned = !sectionCell.includes('Not Assigned');
        
        // Apply level filter
        if (levelId && !levelName.includes(document.getElementById('filterLevel').options[document.getElementById('filterLevel').selectedIndex].text)) {
            shouldShow = false;
        }
        
        // Apply section filter
        if (sectionId && !sectionCell.includes(document.getElementById('filterSection').options[document.getElementById('filterSection').selectedIndex].text)) {
            shouldShow = false;
        }
        
        // Apply status filter
        if (status === 'assigned' && !isAssigned) {
            shouldShow = false;
        } else if (status === 'unassigned' && isAssigned) {
            shouldShow = false;
        }
        
        // Apply search filter
        if (searchText && !studentName.includes(searchText)) {
            shouldShow = false;
        }
        
        // Show or hide row
        row.style.display = shouldShow ? '' : 'none';
    });
}

// Function to view students in a section
function viewSectionStudents(sectionId, sectionName) {
    console.log(`Loading students for section ${sectionId}`);
    const formData = new FormData();
    formData.append('operation', 'getStudentsBySection');
    formData.append('section_id', sectionId);
    
    axios.post('../api/student.php', formData)
        .then(response => {
            console.log('Section Students API Response:', response);
            if (response.data.status === 'success') {
                const students = response.data.data;
                const tbody = document.getElementById('sectionStudentsTableBody');
                
                // Set section name in modal title
                document.getElementById('sectionNameTitle').textContent = sectionName;
                
                // Clear table
                tbody.innerHTML = '';
                
                if (!students || students.length === 0) {
                    tbody.innerHTML = `<tr><td colspan="4" class="text-center">No students in this section</td></tr>`;
                } else {
                    students.forEach(student => {
                        const tr = document.createElement('tr');
                        tr.innerHTML = `
                            <td>${student.name}</td>
                            <td>${student.parent_name || '-'}</td>
                            <td>${student.schedule === 'morning' ? 'Morning' : 'Afternoon'}</td>
                            <td>
                                <button class="btn btn-sm btn-danger remove-from-section" data-id="${student.id}">
                                    <i class="bi bi-x-circle"></i> Remove
                                </button>
                            </td>
                        `;
                        tbody.appendChild(tr);
                    });
                    
                    // Add event listeners to remove buttons
                    document.querySelectorAll('.remove-from-section').forEach(button => {
                        button.addEventListener('click', function() {
                            const studentId = this.dataset.id;
                            if (confirm('Are you sure you want to remove this student from the section?')) {
                                removeStudentFromSection(studentId);
                                // Close the modal
                                const modal = bootstrap.Modal.getInstance(document.getElementById('viewSectionStudentsModal'));
                                modal.hide();
                            }
                        });
                    });
                }
                
                // Show the modal
                const modal = new bootstrap.Modal(document.getElementById('viewSectionStudentsModal'));
                modal.show();
            } else {
                showAlert('Error loading section students: ' + response.data.message, 'danger');
            }
        })
        .catch(error => {
            console.error('Section Students API Call Failed:', error);
            showAlert('Error loading section students: ' + error.message, 'danger');
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