document.addEventListener('DOMContentLoaded', function() {
    // Load student data
    loadStudents();
    
    // Load recent activities
    loadRecentActivities();
});

// Load students for current parent
async function loadStudents() {
    try {
        const user = getCurrentUser();
        
        if (!user) {
            return;
        }
        
        const formData = new FormData();
        formData.append('operation', 'getStudentsByParent');
        formData.append('parent_id', user.id);
        
        const response = await axios.post('../api/student.php', formData);
        
        const studentsContainer = document.getElementById('students-list');
        
        if (response.data.status === 'success') {
            const students = response.data.data;
            
            if (students.length === 0) {
                studentsContainer.innerHTML = `
                    <tr>
                        <td colspan="5" class="text-center">
                            <p class="my-3">You haven't enrolled any children yet.</p>
                            <a href="enrollment.html" class="btn btn-primary btn-sm">
                                <i class="bi bi-plus-circle"></i> Enroll a Child
                            </a>
                        </td>
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
                        <td>${student.name}</td>
                        <td>${student.age}</td>
                        <td>${student.level_name || 'Not assigned'}</td>
                        <td>
                            <span class="badge ${statusBadgeClass} status-badge text-capitalize">
                                ${student.enrollment_status}
                            </span>
                        </td>
                        <td>
                            <a href="student-details.html?id=${student.id}" class="btn btn-sm btn-primary">
                                <i class="bi bi-eye"></i> View
                            </a>
                            <a href="documents.html?student_id=${student.id}" class="btn btn-sm btn-info text-white">
                                <i class="bi bi-file-earmark"></i> Documents
                            </a>
                            <a href="payments.html?student_id=${student.id}" class="btn btn-sm btn-success">
                                <i class="bi bi-credit-card"></i> Payment
                            </a>
                        </td>
                    </tr>
                `;
            });
            
            studentsContainer.innerHTML = html;
        } else {
            studentsContainer.innerHTML = `
                <tr>
                    <td colspan="5" class="text-center text-danger">
                        Error loading students: ${response.data.message}
                    </td>
                </tr>
            `;
        }
    } catch (error) {
        console.error('Error loading students:', error);
        
        const studentsContainer = document.getElementById('students-list');
        studentsContainer.innerHTML = `
            <tr>
                <td colspan="5" class="text-center text-danger">
                    Error connecting to server. Please try again later.
                </td>
            </tr>
        `;
    }
}

// Load recent activities
async function loadRecentActivities() {
    try {
        const user = getCurrentUser();
        
        if (!user) {
            const activitiesList = document.getElementById('activities-list');
            activitiesList.innerHTML = `
                <div class="list-group-item text-warning">
                    Please log in to view your recent activities.
                </div>
            `;
            setTimeout(() => {
                redirectToLogin();
            }, 2000);
            return;
        }
        
        // Add auth header to ensure the server recognizes the user
        const config = {
            params: {
                operation: 'getPaymentsByParent',
                parent_id: user.id
            },
            headers: {
                'X-Auth-User': user.id.toString(),
                'X-Auth-Role': user.role
            }
        };
        
        // Get payment history for simple activity tracking
        const response = await axios.get('../api/payment.php', config);
        
        const activitiesList = document.getElementById('activities-list');
        
        if (response.data && response.data.status === 'success') {
            const payments = response.data.data || [];
            
            if (payments.length === 0) {
                activitiesList.innerHTML = `
                    <div class="list-group-item">
                        <p class="mb-1">No recent activities found.</p>
                    </div>
                `;
                return;
            }
            
            let html = '';
            
            // Show all activities - removed limit
            const recentPayments = payments;
            
            recentPayments.forEach(payment => {
                // Format date
                const paymentDate = payment.payment_date 
                    ? new Date(payment.payment_date).toLocaleString() 
                    : 'N/A';
                
                // Determine status badge class
                let statusBadgeClass = 'bg-warning';
                let statusText = payment.payment_status || 'pending';
                
                if (statusText === 'paid') {
                    statusBadgeClass = 'bg-success';
                } else if (statusText === 'rejected') {
                    statusBadgeClass = 'bg-danger';
                }
                
                html += `
                    <div class="list-group-item">
                        <div class="d-flex w-100 justify-content-between">
                            <h5 class="mb-1">Payment for ${payment.student_name || 'Unknown Student'}</h5>
                            <small>${paymentDate}</small>
                        </div>
                        <p class="mb-1">
                            ${payment.payment_type_name || 'Enrollment Fee'} - 
                            <span class="badge ${statusBadgeClass} text-capitalize">
                                ${statusText}
                            </span>
                        </p>
                        <small>Amount: ₱${parseFloat(payment.payment_amount || 0).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</small>
                    </div>
                `;
            });
            
            activitiesList.innerHTML = html;
            
            // Add a "See All" button if needed
            if (payments.length > 10) {
                const seeAllBtn = document.createElement('div');
                seeAllBtn.className = 'text-center mt-3';
                seeAllBtn.innerHTML = `
                    <a href="payments.html" class="btn btn-sm btn-outline-primary">
                        <i class="bi bi-list"></i> See All Payments
                    </a>
                `;
                activitiesList.parentNode.appendChild(seeAllBtn);
            }
        } else {
            const errorMessage = response.data && response.data.message ? response.data.message : 'Unknown error';
            console.error('Payment API error:', response.data);
            activitiesList.innerHTML = `
                <div class="list-group-item text-danger">
                    <p>Error loading activities: ${errorMessage}</p>
                    <small>Please ensure you have made payments or try refreshing the page.</small>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error loading activities:', error);
        
        const activitiesList = document.getElementById('activities-list');
        activitiesList.innerHTML = `
            <div class="list-group-item text-danger">
                <p>Error connecting to server. Please try again later.</p>
                <small>Details: ${error.message || 'Network error'}</small>
            </div>
        `;
    }
} 