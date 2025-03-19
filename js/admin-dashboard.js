document.addEventListener('DOMContentLoaded', function() {
    // Load dashboard data
    loadDashboardStats();
    
    // Load recent enrollments
    loadRecentEnrollments();
    
    // Load pending payments
    loadPendingPayments();
});

// Load dashboard statistics
async function loadDashboardStats() {
    try {
        // Get all students
        const studentsFormData = new FormData();
        studentsFormData.append('operation', 'getAllStudents');
        const studentsResponse = await axios.post('../api/student.php', studentsFormData);
        
        // Get pending payments
        const paymentsFormData = new FormData();
        paymentsFormData.append('operation', 'getPendingPayments');
        const paymentsResponse = await axios.post('../api/payment.php', paymentsFormData);
        
        // Get users (for parent count)
        const usersFormData = new FormData();
        usersFormData.append('operation', 'getAllUsers');
        const usersResponse = await axios.post('../api/user.php', usersFormData);
        
        // Get teachers count
        const teachersFormData = new FormData();
        teachersFormData.append('operation', 'getAllTeachers');
        const teachersResponse = await axios.post('../api/teacher.php', teachersFormData);
        
        // Update dashboard stats
        if (studentsResponse.data.status === 'success') {
            const students = studentsResponse.data.data;
            document.getElementById('total-students').textContent = students.length;
            
            // Count pending enrollments
            const pendingEnrollments = students.filter(student => student.enrollment_status === 'pending');
            document.getElementById('pending-enrollments').textContent = pendingEnrollments.length;
        }
        
        if (paymentsResponse.data.status === 'success') {
            const pendingPayments = paymentsResponse.data.data;
            document.getElementById('pending-payments').textContent = pendingPayments.length;
        }
        
        if (usersResponse.data.status === 'success') {
            const users = usersResponse.data.data;
            // Count only parent users
            const parents = users.filter(user => user.role === 'parent');
            document.getElementById('total-parents').textContent = parents.length;
            console.log('Parents count:', parents.length);
        } else {
            console.error('Error fetching users:', usersResponse.data.message);
        }
        
        if (teachersResponse.data.status === 'success') {
            const teachers = teachersResponse.data.data;
            document.getElementById('total-teachers').textContent = teachers.length;
            console.log('Teachers count:', teachers.length);
        } else {
            console.error('Error fetching teachers:', teachersResponse.data.message);
        }
    } catch (error) {
        console.error('Error loading dashboard stats:', error);
        console.error('Error details:', error.response || error.message);
    }
}

// Load recent enrollments
async function loadRecentEnrollments() {
    try {
        const user = getCurrentUser();
        
        if (!user || user.role !== 'admin') {
            return;
        }
        
        // Set up headers for authentication
        const config = {
            headers: {
                'X-Auth-User': user.id.toString(),
                'X-Auth-Role': user.role
            }
        };
        
        // Get all students for enrollment tracking
        const response = await axios.get('../api/student.php?operation=getAllStudents', config);
        
        const recentEnrollmentsContainer = document.getElementById('recent-enrollments');
        const enrollmentsPaginationContainer = document.getElementById('enrollments-pagination');
        
        if (response.data.status === 'success') {
            const students = response.data.data;
            
            if (students.length === 0) {
                recentEnrollmentsContainer.innerHTML = '<tr><td colspan="5" class="text-center">No enrollment data available</td></tr>';
                return;
            }
            
            // Sort by created_at date (most recent first)
            students.sort((a, b) => {
                const dateA = a.created_at ? new Date(a.created_at) : new Date(0);
                const dateB = b.created_at ? new Date(b.created_at) : new Date(0);
                return dateB - dateA;
            });
            
            // Get page from URL or default to 1
            const urlParams = new URLSearchParams(window.location.search);
            let currentPage = parseInt(urlParams.get('enrollments_page')) || 1;
            const itemsPerPage = 5; // Default items per page
            
            // Calculate total pages
            const totalPages = Math.ceil(students.length / itemsPerPage);
            
            // Ensure current page is valid
            if (currentPage < 1) currentPage = 1;
            if (currentPage > totalPages) currentPage = totalPages;
            
            // Get students for current page
            const startIndex = (currentPage - 1) * itemsPerPage;
            const endIndex = Math.min(startIndex + itemsPerPage, students.length);
            const studentsToShow = students.slice(startIndex, endIndex);
            
            let html = '';
            
            studentsToShow.forEach(student => {
                // Format created_at date
                const enrollmentDate = student.created_at 
                    ? new Date(student.created_at).toLocaleDateString() 
                    : 'N/A';
                
                // Determine status badge class
                let statusBadgeClass = 'bg-warning';
                
                if (student.enrollment_status === 'enrolled') {
                    statusBadgeClass = 'bg-success';
                } else if (student.enrollment_status === 'rejected') {
                    statusBadgeClass = 'bg-danger';
                }
                
                html += `
                    <tr>
                        <td>${student.name}</td>
                        <td>${student.level_name || 'Not assigned'}</td>
                        <td>${enrollmentDate}</td>
                        <td>
                            <span class="badge ${statusBadgeClass} text-capitalize">
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
            
            recentEnrollmentsContainer.innerHTML = html;
            
            // Set up pagination
            setupEnrollmentsPagination(enrollmentsPaginationContainer, students.length, itemsPerPage, currentPage);
            
            // Update stats card
            document.getElementById('total-students').textContent = students.length;
            
            // Count pending enrollments
            const pendingEnrollments = students.filter(student => student.enrollment_status === 'pending');
            document.getElementById('pending-enrollments').textContent = pendingEnrollments.length;
        } else {
            recentEnrollmentsContainer.innerHTML = `
                <tr>
                    <td colspan="5" class="text-danger">Error: ${response.data.message}</td>
                </tr>
            `;
        }
    } catch (error) {
        console.error('Error loading recent enrollments:', error);
        
        const recentEnrollmentsContainer = document.getElementById('recent-enrollments');
        recentEnrollmentsContainer.innerHTML = `
            <tr>
                <td colspan="5" class="text-danger">Failed to connect to server</td>
            </tr>
        `;
    }
}

// Load pending payments
async function loadPendingPayments() {
    try {
        const user = getCurrentUser();
        
        if (!user || user.role !== 'admin') {
            return;
        }
        
        // Set up headers for authentication
        const config = {
            headers: {
                'X-Auth-User': user.id.toString(),
                'X-Auth-Role': user.role
            }
        };
        
        // Get all payments
        const response = await axios.get('../api/payment.php?operation=getAllPayments', config);
        
        // Find the pending payments container (tbody) by first finding its parent container
        // This avoids ID conflict with the stats card
        const pendingPaymentsContainer = document.querySelector('#pending-payments-container tbody');
        const paymentsPaginationContainer = document.getElementById('payments-pagination');
        
        if (response.data.status === 'success') {
            const allPayments = response.data.data;
            
            // Filter for pending payments
            const pendingPayments = allPayments.filter(payment => 
                payment.payment_status === 'pending' || payment.payment_status === 'pending_approval'
            );
            
            // Find the stats card element - must use a more specific selector to avoid the tbody
            const statsElement = document.querySelector('.stat-card .text-info')
                .closest('.card-body')
                .querySelector('.h5');
                
            if (statsElement) {
                statsElement.textContent = pendingPayments.length;
            }
            
            if (pendingPayments.length === 0) {
                pendingPaymentsContainer.innerHTML = `
                    <tr>
                        <td colspan="5" class="text-center">No pending payments</td>
                    </tr>
                `;
                return;
            }
            
            // Sort by payment date (most recent first)
            pendingPayments.sort((a, b) => {
                const dateA = a.payment_date ? new Date(a.payment_date) : new Date(0);
                const dateB = b.payment_date ? new Date(b.payment_date) : new Date(0);
                return dateB - dateA;
            });
            
            // Get page from URL or default to 1
            const urlParams = new URLSearchParams(window.location.search);
            let currentPage = parseInt(urlParams.get('payments_page')) || 1;
            const itemsPerPage = 5; // Default items per page
            
            // Calculate total pages
            const totalPages = Math.ceil(pendingPayments.length / itemsPerPage);
            
            // Ensure current page is valid
            if (currentPage < 1) currentPage = 1;
            if (currentPage > totalPages) currentPage = totalPages;
            
            // Get payments for current page
            const startIndex = (currentPage - 1) * itemsPerPage;
            const endIndex = Math.min(startIndex + itemsPerPage, pendingPayments.length);
            const paymentsToShow = pendingPayments.slice(startIndex, endIndex);
            
            let html = '';
            
            paymentsToShow.forEach(payment => {
                // Format payment date
                const paymentDate = payment.payment_date 
                    ? new Date(payment.payment_date).toLocaleDateString() 
                    : 'N/A';
                
                // Format amount with proper currency format
                const formattedAmount = payment.payment_amount 
                    ? parseFloat(payment.payment_amount).toLocaleString('en-US', {
                        style: 'currency',
                        currency: 'PHP'
                    })
                    : '₱0.00';
                
                html += `
                    <tr>
                        <td>${payment.student_name || 'Unknown Student'}</td>
                        <td>${payment.payment_type_name || 'Enrollment Fee'}</td>
                        <td>${formattedAmount}</td>
                        <td>${paymentDate}</td>
                        <td>
                            <a href="payments.html?id=${payment.id}" class="btn btn-sm btn-primary">
                                <i class="bi bi-eye"></i> Review
                            </a>
                        </td>
                    </tr>
                `;
            });
            
            pendingPaymentsContainer.innerHTML = html;
            
            // Set up pagination
            setupPaymentsPagination(paymentsPaginationContainer, pendingPayments.length, itemsPerPage, currentPage);
        } else {
            pendingPaymentsContainer.innerHTML = `
                <tr>
                    <td colspan="5" class="text-danger">Error: ${response.data.message}</td>
                </tr>
            `;
        }
    } catch (error) {
        console.error('Error loading pending payments:', error);
        
        // Find the pending payments container by its parent to avoid ID conflict
        const pendingPaymentsContainer = document.querySelector('#pending-payments-container tbody');
        if (pendingPaymentsContainer) {
            pendingPaymentsContainer.innerHTML = `
                <tr>
                    <td colspan="5" class="text-danger">Failed to connect to server</td>
                </tr>
            `;
        }
    }
}

// Setup payment details modal
function setupPaymentDetailsModal() {
    const paymentModal = new bootstrap.Modal(document.getElementById('paymentDetailsModal'));
    
    document.querySelectorAll('.view-payment').forEach(button => {
        button.addEventListener('click', async function() {
            try {
                const payment = JSON.parse(this.dataset.payment);
                
                // Update payment information
                document.getElementById('payment-date').textContent = payment.payment_date 
                    ? new Date(payment.payment_date).toLocaleDateString() 
                    : 'N/A';
                document.getElementById('payment-type').textContent = payment.payment_type_name || 'Enrollment Fee';
                document.getElementById('payment-amount').textContent = `₱${payment.payment_amount || '0.00'}`;
                document.getElementById('payment-method').textContent = payment.payment_method || 'N/A';
                document.getElementById('payment-reference').textContent = payment.payment_reference || 'N/A';
                
                // Set status badge
                let statusBadgeClass = 'bg-warning';
                let statusText = 'Pending';
                
                if (payment.payment_status === 'paid' || payment.payment_status === 'approved') {
                    statusBadgeClass = 'bg-success';
                    statusText = 'Approved';
                } else if (payment.payment_status === 'rejected') {
                    statusBadgeClass = 'bg-danger';
                    statusText = 'Rejected';
                } else if (payment.payment_status === 'pending_approval' || payment.payment_status === 'pending') {
                    statusBadgeClass = 'bg-warning';
                    statusText = 'Pending Approval';
                }
                
                document.getElementById('payment-status-badge').innerHTML = 
                    `<span class="badge ${statusBadgeClass}">${statusText}</span>`;
                
                // Get student details to get emergency contact name
                const user = getCurrentUser();
                const studentResponse = await axios.get('../api/student.php', {
                    params: {
                        operation: 'getStudentById',
                        id: payment.student_id
                    },
                    headers: {
                        'X-Auth-User': user.id.toString(),
                        'X-Auth-Role': user.role
                    }
                });

                // Update student information
                document.getElementById('payment-student-name').textContent = payment.student_name || 'N/A';
                
                // Use emergency contact name for parent/guardian
                if (studentResponse.data.status === 'success' && studentResponse.data.data.emergency) {
                    document.getElementById('payment-parent-name').textContent = 
                        studentResponse.data.data.emergency.guardian_name || 'N/A';
                } else {
                    document.getElementById('payment-parent-name').textContent = 'N/A';
                }
                
                // Handle receipt image
                const receiptImage = document.getElementById('receiptImage');
                const receiptError = document.getElementById('receiptError');
                const receiptDownload = document.getElementById('receiptDownload');
                
                if (payment.payment_receipt) {
                    const receiptPath = `../uploads/receipts/${payment.payment_receipt}`;
                    
                    // Update download link
                    receiptDownload.href = receiptPath;
                    receiptDownload.classList.remove('d-none');
                    
                    // Show loading state
                    receiptImage.src = '';
                    receiptError.classList.add('d-none');
                    receiptImage.classList.add('d-none');
                    
                    // Try to load the image
                    receiptImage.onload = function() {
                        receiptImage.classList.remove('d-none');
                        receiptError.classList.add('d-none');
                    };
                    
                    receiptImage.onerror = function() {
                        receiptImage.classList.add('d-none');
                        receiptError.classList.remove('d-none');
                    };
                    
                    // Set image source
                    receiptImage.src = receiptPath;
                } else {
                    receiptImage.classList.add('d-none');
                    receiptError.classList.remove('d-none');
                    receiptError.textContent = 'No receipt uploaded';
                    receiptDownload.classList.add('d-none');
                }
                
                // Show modal
                paymentModal.show();
            } catch (error) {
                console.error('Error loading payment details:', error);
                showAlert('danger', 'Error loading payment details. Please try again.');
            }
        });
    });
}

// Setup payment approval/rejection buttons
function setupPaymentActions() {
    // Approve payment buttons
    document.querySelectorAll('.approve-btn').forEach(button => {
        button.addEventListener('click', async function() {
            try {
                const user = getCurrentUser();
                if (!user) {
                    return;
                }
                
                const paymentData = {
                    enrollment_id: this.dataset.enrollmentId,
                    student_id: this.dataset.studentId,
                    admin_id: user.id,
                    payment_method: this.dataset.method,
                    amount: this.dataset.amount
                };
                
                const formData = new FormData();
                formData.append('operation', 'approvePayment');
                formData.append('json', JSON.stringify(paymentData));
                
                const response = await axios.post('../api/payment.php', formData);
                
                if (response.data.status === 'success') {
                    showAlert('success', 'Payment approved successfully.');
                    // Reload payments and stats
                    loadPendingPayments();
                    loadDashboardStats();
                } else {
                    showAlert('danger', `Failed to approve payment: ${response.data.message}`);
                }
            } catch (error) {
                console.error('Error approving payment:', error);
                showAlert('danger', 'Error connecting to server. Please try again later.');
            }
        });
    });
    
    // Reject payment buttons
    document.querySelectorAll('.reject-btn').forEach(button => {
        button.addEventListener('click', async function() {
            try {
                // Ask for rejection reason
                const reason = prompt('Please enter a reason for rejecting this payment:');
                
                if (reason === null) {
                    return; // User cancelled
                }
                
                const paymentData = {
                    student_id: this.dataset.studentId,
                    reason: reason
                };
                
                const formData = new FormData();
                formData.append('operation', 'rejectPayment');
                formData.append('json', JSON.stringify(paymentData));
                
                const response = await axios.post('../api/payment.php', formData);
                
                if (response.data.status === 'success') {
                    showAlert('success', 'Payment rejected successfully.');
                    // Reload payments and stats
                    loadPendingPayments();
                    loadDashboardStats();
                } else {
                    showAlert('danger', `Failed to reject payment: ${response.data.message}`);
                }
            } catch (error) {
                console.error('Error rejecting payment:', error);
                showAlert('danger', 'Error connecting to server. Please try again later.');
            }
        });
    });
}

// Show alert message
function showAlert(type, message) {
    // Remove any existing alerts
    const existingAlerts = document.querySelectorAll('.alert-dynamic');
    existingAlerts.forEach(alert => alert.remove());
    
    // Create new alert
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show alert-dynamic`;
    alertDiv.role = 'alert';
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;
    
    // Insert at the top of the main element
    const main = document.querySelector('main');
    main.insertBefore(alertDiv, main.firstChild.nextSibling);
    
    // Auto dismiss after 5 seconds
    setTimeout(() => {
        const bsAlert = new bootstrap.Alert(alertDiv);
        bsAlert.close();
    }, 5000);
}

// Set up pagination for enrollments
function setupEnrollmentsPagination(container, totalItems, itemsPerPage, currentPage) {
    if (!container) return;
    
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    
    // Clear container
    container.innerHTML = '';
    
    // Create pagination info
    const paginationInfo = document.createElement('div');
    paginationInfo.className = 'pagination-info';
    paginationInfo.textContent = `Showing ${Math.min(1, totalItems) + (currentPage - 1) * itemsPerPage}-${Math.min(totalItems, currentPage * itemsPerPage)} of ${totalItems} enrollments`;
    container.appendChild(paginationInfo);
    
    // Create pagination controls
    if (totalPages > 1) {
        const paginationControls = document.createElement('ul');
        paginationControls.className = 'pagination pagination-sm mb-0';
        
        // Previous button
        const prevLi = document.createElement('li');
        prevLi.className = `page-item ${currentPage === 1 ? 'disabled' : ''}`;
        const prevLink = document.createElement('button');
        prevLink.className = 'page-link';
        prevLink.textContent = 'Previous';
        prevLink.dataset.page = currentPage - 1;
        prevLi.appendChild(prevLink);
        paginationControls.appendChild(prevLi);
        
        // Page numbers
        for (let i = 1; i <= totalPages; i++) {
            if (totalPages <= 5 || 
                i === 1 || 
                i === totalPages || 
                (i >= currentPage - 1 && i <= currentPage + 1)) {
                
                const pageLi = document.createElement('li');
                pageLi.className = `page-item ${i === currentPage ? 'active' : ''}`;
                const pageLink = document.createElement('button');
                pageLink.className = 'page-link';
                pageLink.textContent = i;
                pageLink.dataset.page = i;
                pageLi.appendChild(pageLink);
                paginationControls.appendChild(pageLi);
            } else if (
                (i === 2 && currentPage > 3) || 
                (i === totalPages - 1 && currentPage < totalPages - 2)
            ) {
                // Add ellipsis
                const ellipsisLi = document.createElement('li');
                ellipsisLi.className = 'page-item disabled';
                const ellipsisSpan = document.createElement('span');
                ellipsisSpan.className = 'page-link';
                ellipsisSpan.textContent = '...';
                ellipsisLi.appendChild(ellipsisSpan);
                paginationControls.appendChild(ellipsisLi);
            }
        }
        
        // Next button
        const nextLi = document.createElement('li');
        nextLi.className = `page-item ${currentPage === totalPages ? 'disabled' : ''}`;
        const nextLink = document.createElement('button');
        nextLink.className = 'page-link';
        nextLink.textContent = 'Next';
        nextLink.dataset.page = currentPage + 1;
        nextLi.appendChild(nextLink);
        paginationControls.appendChild(nextLi);
        
        container.appendChild(paginationControls);
        
        // Add event listeners to pagination buttons
        document.querySelectorAll('#enrollments-pagination .page-link').forEach(btn => {
            if (!btn.closest('.disabled')) {
                btn.addEventListener('click', function() {
                    const page = parseInt(this.dataset.page);
                    if (!isNaN(page)) {
                        const url = new URL(window.location.href);
                        url.searchParams.set('enrollments_page', page);
                        window.history.pushState({}, '', url);
                        loadRecentEnrollments();
                    }
                });
            }
        });
    }
    
    // Add View All button
    const viewAllBtnContainer = document.createElement('div');
    viewAllBtnContainer.innerHTML = `
        <a href="enrollments.html" class="btn btn-sm btn-outline-primary">
            <i class="bi bi-list"></i> View All Enrollments
        </a>
    `;
    container.appendChild(viewAllBtnContainer);
}

// Set up pagination for payments
function setupPaymentsPagination(container, totalItems, itemsPerPage, currentPage) {
    if (!container) return;
    
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    
    // Clear container
    container.innerHTML = '';
    
    // Create pagination info
    const paginationInfo = document.createElement('div');
    paginationInfo.className = 'pagination-info';
    paginationInfo.textContent = `Showing ${Math.min(1, totalItems) + (currentPage - 1) * itemsPerPage}-${Math.min(totalItems, currentPage * itemsPerPage)} of ${totalItems} pending payments`;
    container.appendChild(paginationInfo);
    
    // Create pagination controls
    if (totalPages > 1) {
        const paginationControls = document.createElement('ul');
        paginationControls.className = 'pagination pagination-sm mb-0';
        
        // Previous button
        const prevLi = document.createElement('li');
        prevLi.className = `page-item ${currentPage === 1 ? 'disabled' : ''}`;
        const prevLink = document.createElement('button');
        prevLink.className = 'page-link';
        prevLink.textContent = 'Previous';
        prevLink.dataset.page = currentPage - 1;
        prevLi.appendChild(prevLink);
        paginationControls.appendChild(prevLi);
        
        // Page numbers
        for (let i = 1; i <= totalPages; i++) {
            if (totalPages <= 5 || 
                i === 1 || 
                i === totalPages || 
                (i >= currentPage - 1 && i <= currentPage + 1)) {
                
                const pageLi = document.createElement('li');
                pageLi.className = `page-item ${i === currentPage ? 'active' : ''}`;
                const pageLink = document.createElement('button');
                pageLink.className = 'page-link';
                pageLink.textContent = i;
                pageLink.dataset.page = i;
                pageLi.appendChild(pageLink);
                paginationControls.appendChild(pageLi);
            } else if (
                (i === 2 && currentPage > 3) || 
                (i === totalPages - 1 && currentPage < totalPages - 2)
            ) {
                // Add ellipsis
                const ellipsisLi = document.createElement('li');
                ellipsisLi.className = 'page-item disabled';
                const ellipsisSpan = document.createElement('span');
                ellipsisSpan.className = 'page-link';
                ellipsisSpan.textContent = '...';
                ellipsisLi.appendChild(ellipsisSpan);
                paginationControls.appendChild(ellipsisLi);
            }
        }
        
        // Next button
        const nextLi = document.createElement('li');
        nextLi.className = `page-item ${currentPage === totalPages ? 'disabled' : ''}`;
        const nextLink = document.createElement('button');
        nextLink.className = 'page-link';
        nextLink.textContent = 'Next';
        nextLink.dataset.page = currentPage + 1;
        nextLi.appendChild(nextLink);
        paginationControls.appendChild(nextLi);
        
        container.appendChild(paginationControls);
        
        // Add event listeners to pagination buttons
        document.querySelectorAll('#payments-pagination .page-link').forEach(btn => {
            if (!btn.closest('.disabled')) {
                btn.addEventListener('click', function() {
                    const page = parseInt(this.dataset.page);
                    if (!isNaN(page)) {
                        const url = new URL(window.location.href);
                        url.searchParams.set('payments_page', page);
                        window.history.pushState({}, '', url);
                        loadPendingPayments();
                    }
                });
            }
        });
    }
    
    // Add View All button
    const viewAllBtnContainer = document.createElement('div');
    viewAllBtnContainer.innerHTML = `
        <a href="payments.html?status=pending_approval" class="btn btn-sm btn-outline-primary">
            <i class="bi bi-list"></i> View All Pending Payments
        </a>
    `;
    container.appendChild(viewAllBtnContainer);
} 