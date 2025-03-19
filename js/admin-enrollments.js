document.addEventListener('DOMContentLoaded', async function() {
    // Initialize filters
    await loadLevelsForFilter();
    
    // Load all enrollments initially
    await loadEnrollments();
    
    // Set up filter event listeners
    document.getElementById('status-filter').addEventListener('change', loadEnrollments);
    document.getElementById('level-filter').addEventListener('change', loadEnrollments);
    document.getElementById('date-filter').addEventListener('change', loadEnrollments);
    
    // Set up search with debounce
    const searchInput = document.getElementById('search-filter');
    let debounceTimer;
    searchInput.addEventListener('input', function() {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(loadEnrollments, 500);
    });
    
    // Set up logout
    document.getElementById('logoutBtn').addEventListener('click', function(e) {
        e.preventDefault();
        localStorage.removeItem('user');
        window.location.href = '../login.html';
    });
});

// Load levels for the filter dropdown
async function loadLevelsForFilter() {
    try {
        const response = await axios.get('../api/student.php', {
            params: {
                operation: 'getLevels'
            }
        });
        
        if (response.data.status === 'success') {
            const levels = response.data.data;
            const levelFilter = document.getElementById('level-filter');
            
            levels.forEach(level => {
                const option = document.createElement('option');
                option.value = level.id;
                option.textContent = level.level_name;
                levelFilter.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Error loading levels:', error);
    }
}

// Load enrollments based on filters
async function loadEnrollments() {
    try {
        // Get user for authentication
        const user = getCurrentUser();
        if (!user) {
            window.location.href = '../login.html';
            return;
        }
        
        // Get filter values
        const statusFilter = document.getElementById('status-filter').value;
        const levelFilter = document.getElementById('level-filter').value;
        const dateFilter = document.getElementById('date-filter').value;
        const searchFilter = document.getElementById('search-filter').value;
        
        // Get all students
        const response = await axios.get('../api/student.php', {
            params: {
                operation: 'getAllStudents'
            },
            headers: {
                'X-Auth-User': user.id.toString(),
                'X-Auth-Role': user.role
            }
        });
        
        if (response.data.status === 'success') {
            let students = response.data.data;
            
            // Apply filters
            if (statusFilter !== 'all') {
                students = students.filter(student => student.enrollment_status === statusFilter);
            }
            
            if (levelFilter !== 'all') {
                students = students.filter(student => student.level_id === levelFilter);
            }
            
            // Apply date filter
            if (dateFilter !== 'all') {
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                
                const weekStart = new Date(today);
                weekStart.setDate(today.getDate() - today.getDay());
                
                const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
                
                students = students.filter(student => {
                    const enrollmentDate = new Date(student.created_at);
                    
                    if (dateFilter === 'today') {
                        return enrollmentDate >= today;
                    } else if (dateFilter === 'week') {
                        return enrollmentDate >= weekStart;
                    } else if (dateFilter === 'month') {
                        return enrollmentDate >= monthStart;
                    }
                    return true;
                });
            }
            
            // Apply search filter
            if (searchFilter) {
                const lowerSearch = searchFilter.toLowerCase();
                students = students.filter(student => 
                    student.name.toLowerCase().includes(lowerSearch) || 
                    student.id.toString().includes(lowerSearch) ||
                    (student.parent_name && student.parent_name.toLowerCase().includes(lowerSearch))
                );
            }
            
            // Display filtered results
            displayEnrollments(students);
        } else {
            showAlert('danger', 'Error loading enrollments: ' + response.data.message);
        }
    } catch (error) {
        console.error('Error loading enrollments:', error);
        showAlert('danger', 'Failed to connect to server. Please try again later.');
    }
}

// Display enrollments in the table
function displayEnrollments(students) {
    const enrollmentsList = document.getElementById('enrollments-list');
    
    if (students.length === 0) {
        enrollmentsList.innerHTML = `
            <tr>
                <td colspan="7" class="text-center">No enrollments found</td>
            </tr>
        `;
        return;
    }
    
    let html = '';
    
    students.forEach(student => {
        // Determine status badge class
        let statusBadgeClass = 'bg-warning';
        
        if (student.enrollment_status === 'enrolled') {
            statusBadgeClass = 'bg-success';
        } else if (student.enrollment_status === 'rejected') {
            statusBadgeClass = 'bg-danger';
        }
        
        // Format date
        const enrollmentDate = new Date(student.created_at).toLocaleDateString();
        
        html += `
            <tr>
                <td>${student.id}</td>
                <td>${student.name}</td>
                <td>${student.parent_name || 'Unknown'}</td>
                <td>${student.level_name || 'Not assigned'}</td>
                <td>${enrollmentDate}</td>
                <td>
                    <span class="badge ${statusBadgeClass} status-badge text-capitalize">
                        ${student.enrollment_status}
                    </span>
                </td>
                <td>
                    <a href="enrollment-details.html?id=${student.id}" class="btn btn-sm btn-primary">
                        <i class="bi bi-eye"></i> View
                    </a>
                </td>
            </tr>
        `;
    });
    
    enrollmentsList.innerHTML = html;
    setupPagination(students.length);
}

// Set up pagination
function setupPagination(totalItems) {
    // Simple pagination for now
    const paginationElement = document.getElementById('pagination');
    paginationElement.innerHTML = '';
    
    // Only show pagination if we have a lot of items
    if (totalItems <= 10) {
        return;
    }
    
    const pageCount = Math.ceil(totalItems / 10);
    
    // Previous button
    const prevLi = document.createElement('li');
    prevLi.className = 'page-item';
    prevLi.innerHTML = `<a class="page-link" href="#" aria-label="Previous">
        <span aria-hidden="true">&laquo;</span>
    </a>`;
    paginationElement.appendChild(prevLi);
    
    // Page numbers
    for (let i = 1; i <= pageCount; i++) {
        const li = document.createElement('li');
        li.className = i === 1 ? 'page-item active' : 'page-item';
        li.innerHTML = `<a class="page-link" href="#">${i}</a>`;
        paginationElement.appendChild(li);
    }
    
    // Next button
    const nextLi = document.createElement('li');
    nextLi.className = 'page-item';
    nextLi.innerHTML = `<a class="page-link" href="#" aria-label="Next">
        <span aria-hidden="true">&raquo;</span>
    </a>`;
    paginationElement.appendChild(nextLi);
}

// Helper function to get the current user
function getCurrentUser() {
    const userString = localStorage.getItem('user');
    if (!userString) {
        return null;
    }
    
    try {
        const user = JSON.parse(userString);
        return user;
    } catch (e) {
        console.error('Error parsing user from localStorage:', e);
        return null;
    }
}

// Show alert message
function showAlert(type, message) {
    // Create alert element
    const alertElement = document.createElement('div');
    alertElement.className = `alert alert-${type} alert-dismissible fade show`;
    alertElement.role = 'alert';
    alertElement.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;
    
    // Insert at top of main content
    const main = document.querySelector('main');
    main.insertBefore(alertElement, main.firstChild);
    
    // Auto-dismiss after 5 seconds
    setTimeout(() => {
        if (alertElement.parentNode) {
            const bsAlert = new bootstrap.Alert(alertElement);
            bsAlert.close();
        }
    }, 5000);
} 