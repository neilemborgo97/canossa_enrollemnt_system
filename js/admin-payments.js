document.addEventListener('DOMContentLoaded', async function() {
    // Initialize payment types for filter
    await loadPaymentTypes();
    
    // Load all payments initially
    await loadPayments();
    
    // Set up filter event listeners
    document.getElementById('status-filter').addEventListener('change', loadPayments);
    document.getElementById('payment-type-filter').addEventListener('change', loadPayments);
    document.getElementById('date-filter').addEventListener('change', loadPayments);
    
    // Set up search with debounce
    const searchInput = document.getElementById('search-filter');
    let debounceTimer;
    searchInput.addEventListener('input', function() {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(loadPayments, 500);
    });
    
    // Set up export and print functionality
    const exportBtn = document.getElementById('exportBtn');
    if (exportBtn) {
        exportBtn.addEventListener('click', exportPayments);
    }
    
    const printBtn = document.getElementById('printBtn');
    if (printBtn) {
        printBtn.addEventListener('click', window.print);
    }
    
    // Set up logout
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function(e) {
            e.preventDefault();
            localStorage.removeItem('user');
            window.location.href = '../login.html';
        });
    }
});

// Load payment types for the filter dropdown
async function loadPaymentTypes() {
    try {
        const response = await axios.get('../api/payment.php', {
            params: {
                operation: 'getPaymentTypes'
            }
        });
        
        if (response.data.status === 'success') {
            const paymentTypes = response.data.data;
            const paymentTypeFilter = document.getElementById('payment-type-filter');
            
            paymentTypes.forEach(type => {
                const option = document.createElement('option');
                option.value = type.id;
                option.textContent = type.name;
                paymentTypeFilter.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Error loading payment types:', error);
    }
}

// Load payments data
async function loadPayments() {
    try {
        // Get admin user information (for authorization)
        const user = getCurrentUser();
        if (!user || user.role !== 'admin') {
            showAlert('danger', 'Admin authorization required');
            setTimeout(() => {
                window.location.href = '../login.html';
            }, 2000);
            return;
        }
        
        // Add custom auth headers for API access
        const config = {
            headers: {
                'X-Auth-User': user.id.toString(),
                'X-Auth-Role': user.role
            }
        };
        
        // Get all payments (without limit)
        const response = await axios.get('../api/payment.php?operation=getAllPayments', config);
        
        if (response.data.status === 'success') {
            const allPayments = response.data.data;
            
            // Store payments in global variable for filtering
            window.paymentsData = allPayments;
            
            // Update stats cards
            updatePaymentStats(allPayments);
            
            // Get filter values
            const statusFilter = document.getElementById('status-filter').value;
            const paymentTypeFilter = document.getElementById('payment-type-filter').value;
            const dateFilter = document.getElementById('date-filter').value;
            const searchFilter = document.getElementById('search-filter').value.trim().toLowerCase();
            
            // Apply filters if any are set
            let filteredPayments = allPayments;
            
            if (statusFilter !== 'all') {
                filteredPayments = filteredPayments.filter(payment => payment.payment_status === statusFilter);
            }
            
            if (paymentTypeFilter !== 'all') {
                filteredPayments = filteredPayments.filter(payment => payment.payment_type_id == paymentTypeFilter);
            }
            
            if (dateFilter !== 'all') {
                const today = new Date();
                const startDate = new Date();
                
                if (dateFilter === 'today') {
                    startDate.setHours(0, 0, 0, 0);
                } else if (dateFilter === 'week') {
                    startDate.setDate(today.getDate() - 7);
                } else if (dateFilter === 'month') {
                    startDate.setMonth(today.getMonth() - 1);
                }
                
                filteredPayments = filteredPayments.filter(payment => {
                    if (!payment.payment_date) return false;
                    const paymentDate = new Date(payment.payment_date);
                    return paymentDate >= startDate && paymentDate <= today;
                });
            }
            
            if (searchFilter) {
                filteredPayments = filteredPayments.filter(payment => {
                    return (
                        (payment.student_name && payment.student_name.toLowerCase().includes(searchFilter)) ||
                        (payment.id && payment.id.toString().includes(searchFilter)) ||
                        (payment.payment_method && payment.payment_method.toLowerCase().includes(searchFilter)) ||
                        (payment.payment_reference && payment.payment_reference.toLowerCase().includes(searchFilter))
                    );
                });
            }
            
            // Configure pagination
            const itemsPerPage = 25; // Increased from default
            const totalItems = filteredPayments.length;
            const totalPages = Math.ceil(totalItems / itemsPerPage);
            
            // Get current page from URL or default to 1
            const urlParams = new URLSearchParams(window.location.search);
            let currentPage = parseInt(urlParams.get('page')) || 1;
            
            // Ensure current page is valid
            if (currentPage < 1) currentPage = 1;
            if (currentPage > totalPages) currentPage = totalPages;
            
            // Calculate slice indices for current page
            const startIndex = (currentPage - 1) * itemsPerPage;
            const endIndex = startIndex + itemsPerPage;
            
            // Get payments for current page
            const currentPagePayments = filteredPayments.slice(startIndex, endIndex);
            
            // Display payments for current page
            displayPayments(currentPagePayments);
            
            // Setup pagination
            setupPagination(totalItems, itemsPerPage, currentPage);
            
            // Update URL with current page
            if (history.pushState) {
                const newUrl = new URL(window.location.href);
                newUrl.searchParams.set('page', currentPage);
                window.history.pushState({path: newUrl.href}, '', newUrl.href);
            }
        } else {
            console.error('Error loading payments:', response.data.message);
            showAlert('danger', `Error loading payments: ${response.data.message}`);
        }
    } catch (error) {
        console.error('Error fetching payments:', error);
        showAlert('danger', 'Error connecting to server. Please try again later.');
    }
}

// Update payment statistics
function updatePaymentStats(payments) {
    // Total payments
    document.getElementById('total-payments').textContent = payments.length;
    
    // Pending approval count
    const pendingApprovalCount = payments.filter(payment => 
        payment.payment_status === 'pending_approval'
    ).length;
    document.getElementById('pending-approval-count').textContent = pendingApprovalCount;
    
    // Approved count
    const approvedCount = payments.filter(payment => 
        payment.payment_status === 'paid'
    ).length;
    document.getElementById('approved-count').textContent = approvedCount;
    
    // Rejected count
    const rejectedCount = payments.filter(payment => 
        payment.payment_status === 'rejected'
    ).length;
    document.getElementById('rejected-count').textContent = rejectedCount;
}

// Display payments in the table
function displayPayments(payments) {
    const paymentsList = document.getElementById('payments-list');
    
    if (payments.length === 0) {
        paymentsList.innerHTML = `
            <tr>
                <td colspan="8" class="text-center">No payments found</td>
            </tr>
        `;
        return;
    }
    
    // Sort payments by date (most recent first)
    payments.sort((a, b) => {
        const dateA = a.payment_date ? new Date(a.payment_date) : new Date(0);
        const dateB = b.payment_date ? new Date(b.payment_date) : new Date(0);
        return dateB - dateA;
    });
    
    let html = '';
    
    payments.forEach(payment => {
        const paymentDate = payment.payment_date 
            ? new Date(payment.payment_date).toLocaleDateString() 
            : 'N/A';
        
        const status = payment.payment_status || 'pending';
        const statusClass = getPaymentStatusClass(status);
        const statusText = getPaymentStatusText(status);
        
        // Create action buttons based on status
        let actionButtons = '';
        if (status === 'pending' || status === 'pending_approval') {
            actionButtons = `
                <button class="btn btn-sm btn-primary view-payment" data-id="${payment.id}">
                    <i class="bi bi-eye"></i> View
                </button>
            `;
        } else {
            actionButtons = `
                <button class="btn btn-sm btn-secondary view-payment" data-id="${payment.id}">
                    <i class="bi bi-eye"></i> View
                </button>
            `;
        }
        
        html += `
            <tr>
                <td>${payment.id}</td>
                <td>${payment.student_name || 'N/A'}</td>
                <td>${payment.payment_type_name || 'Enrollment Fee'}</td>
                <td>₱${payment.payment_amount || '0.00'}</td>
                <td>${payment.payment_method || 'N/A'}</td>
                <td>${paymentDate}</td>
                <td><span class="badge ${statusClass}">${statusText}</span></td>
                <td>${actionButtons}</td>
            </tr>
        `;
    });
    
    paymentsList.innerHTML = html;
    
    // Add event listeners to view payment buttons
    document.querySelectorAll('.view-payment').forEach(button => {
        button.addEventListener('click', () => viewPaymentDetails(button.dataset.id));
    });
    
    // Set up pagination
    setupPagination(payments.length);
}

// View payment details
async function viewPaymentDetails(paymentId) {
    try {
        const user = getCurrentUser();
        if (!user) return;
        
        // Get the payment information from the table for basic details
        const paymentRow = document.querySelector(`.view-payment[data-id="${paymentId}"]`).closest('tr');
        
        if (!paymentRow) {
            showAlert('danger', 'Payment data not found');
            return;
        }
        
        // Get all students for their parentIds
        const studentsResponse = await axios.get('../api/student.php', {
            params: {
                operation: 'getAllStudents'
            },
            headers: {
                'X-Auth-User': user.id.toString(),
                'X-Auth-Role': user.role
            }
        });
        
        if (studentsResponse.data.status !== 'success') {
            throw new Error('Failed to get students data');
        }
        
        const students = studentsResponse.data.data || [];
        const parentIds = [...new Set(students.map(student => student.parent_id))];
        
        // Get all payments to find the specific one
        let targetPayment = null;
        for (const parentId of parentIds) {
            if (!parentId) continue;
            
            const response = await axios.get('../api/payment.php', {
                params: {
                    operation: 'getPaymentsByParent',
                    parent_id: parentId
                },
                headers: {
                    'X-Auth-User': user.id.toString(),
                    'X-Auth-Role': user.role
                }
            });
            
            if (response.data.status === 'success' && response.data.data) {
                const foundPayment = response.data.data.find(p => p.id == paymentId);
                if (foundPayment) {
                    targetPayment = foundPayment;
                    break;
                }
            }
        }
        
        if (!targetPayment) {
            showAlert('danger', 'Payment data could not be retrieved');
            return;
        }
        
        // Update payment details in modal
        document.getElementById('payment-date').textContent = targetPayment.payment_date 
            ? new Date(targetPayment.payment_date).toLocaleDateString() 
            : 'N/A';
        document.getElementById('payment-amount').textContent = `₱${targetPayment.payment_amount || '0.00'}`;
        document.getElementById('payment-type').textContent = targetPayment.payment_type_name || 'Enrollment Fee';
        document.getElementById('payment-method').textContent = targetPayment.payment_method || 'N/A';
        document.getElementById('payment-reference').textContent = targetPayment.payment_reference || 'N/A';
        document.getElementById('payment-student-name').textContent = targetPayment.student_name || 'N/A';
        
        // Try to get parent name
        const student = students.find(s => s.id == targetPayment.student_id);
        if (student) {
            // Get student details to get emergency contact name
            const studentResponse = await axios.get('../api/student.php', {
                params: {
                    operation: 'getStudentById',
                    id: student.id
                },
                headers: {
                    'X-Auth-User': user.id.toString(),
                    'X-Auth-Role': user.role
                }
            });
            
            // Use emergency contact name for parent/guardian
            if (studentResponse.data.status === 'success') {
                const data = studentResponse.data.data;
                const emergency = data.emergency_contact || data.emergency;
                document.getElementById('payment-parent-name').textContent = 
                    (emergency?.guardian_name) || (data.parent?.name) || 'N/A';
            } else {
                document.getElementById('payment-parent-name').textContent = 'N/A';
            }
        } else {
            document.getElementById('payment-parent-name').textContent = 'N/A';
        }
        
        // Update notes if available
        const notesContainer = document.getElementById('notes-container');
        if (targetPayment.notes) {
            document.getElementById('payment-notes').textContent = targetPayment.notes;
            notesContainer.classList.remove('d-none');
        } else {
            document.getElementById('payment-notes').textContent = 'None';
            notesContainer.classList.remove('d-none');
        }
        
        // Update status badge
        const statusBadge = document.getElementById('payment-status-badge');
        const status = targetPayment.payment_status || 'pending';
        const statusClass = getPaymentStatusClass(status);
        const statusText = getPaymentStatusText(status);
        statusBadge.innerHTML = `<span class="badge ${statusClass}">${statusText}</span>`;
        
        // Handle receipt image
        const receiptImage = document.getElementById('receiptImage');
        const receiptError = document.getElementById('receiptError');
        const receiptDownload = document.getElementById('receiptDownload');
        
        if (targetPayment.payment_receipt) {
            const receiptPath = `../uploads/receipts/${targetPayment.payment_receipt}`;
            
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
            receiptDownload.classList.add('d-none');
        }
        
        // Set up approve/reject buttons
        const approvePaymentBtn = document.getElementById('approvePaymentBtn');
        const rejectPaymentBtn = document.getElementById('rejectPaymentBtn');
        
        if (status === 'pending' || status === 'pending_approval') {
            approvePaymentBtn.classList.remove('d-none');
            rejectPaymentBtn.classList.remove('d-none');
            
            // Set up event listeners
            approvePaymentBtn.onclick = () => approvePayment(paymentId);
            rejectPaymentBtn.onclick = () => rejectPayment(paymentId);
        } else {
            approvePaymentBtn.classList.add('d-none');
            rejectPaymentBtn.classList.add('d-none');
        }
        
        // Show modal
        const modal = new bootstrap.Modal(document.getElementById('paymentDetailsModal'));
        modal.show();
    } catch (error) {
        console.error('Error viewing payment details:', error);
        showAlert('danger', 'Failed to load payment details. Please try again later.');
    }
}

// Approve payment function
async function approvePayment(paymentId) {
    try {
        const user = getCurrentUser();
        if (!user) return;
        
        showAlert('info', 'Processing payment approval...');
        
        // Prepare form data for the API call
        const formData = new FormData();
        formData.append('operation', 'approvePayment');
        formData.append('payment_id', paymentId);
        
        // Make the actual API call
        const response = await axios.post('../api/payment.php', formData, {
            headers: {
                'X-Auth-User': user.id.toString(),
                'X-Auth-Role': user.role
            }
        });
        
        if (response.data.status === 'success') {
            // Update UI in the modal
            const statusBadge = document.getElementById('payment-status-badge');
            if (statusBadge) {
                statusBadge.innerHTML = '<span class="badge bg-success">Approved</span>';
            }
            
            // Hide the action buttons
            const approvePaymentBtn = document.getElementById('approvePaymentBtn');
            const rejectPaymentBtn = document.getElementById('rejectPaymentBtn');
            if (approvePaymentBtn && rejectPaymentBtn) {
                approvePaymentBtn.classList.add('d-none');
                rejectPaymentBtn.classList.add('d-none');
            }
            
            showAlert('success', 'Payment approved successfully!');
            
            // Update the payments list
            await loadPayments();
            
            // Don't close the modal immediately so the user can see the status change
            setTimeout(() => {
                const modal = bootstrap.Modal.getInstance(document.getElementById('paymentDetailsModal'));
                if (modal) modal.hide();
            }, 1500);
        } else {
            showAlert('danger', 'Error approving payment: ' + response.data.message);
        }
    } catch (error) {
        console.error('Error approving payment:', error);
        showAlert('danger', 'Failed to connect to server. Please try again later.');
    }
}

// Reject payment function
async function rejectPayment(paymentId) {
    try {
        const user = getCurrentUser();
        if (!user) return;
        
        // Get reason for rejection
        const reason = prompt('Please provide a reason for rejecting this payment:');
        if (reason === null) {
            // User cancelled the prompt
            return;
        }
        
        if (reason.trim() === '') {
            showAlert('warning', 'A reason is required to reject the payment');
            return;
        }
        
        showAlert('info', 'Processing payment rejection...');
        
        // Prepare form data for the API call
        const formData = new FormData();
        formData.append('operation', 'rejectPayment');
        formData.append('payment_id', paymentId);
        formData.append('reason', reason.trim());
        
        // Make the actual API call
        const response = await axios.post('../api/payment.php', formData, {
            headers: {
                'X-Auth-User': user.id.toString(),
                'X-Auth-Role': user.role
            }
        });
        
        if (response.data.status === 'success') {
            // Update UI in the modal
            const statusBadge = document.getElementById('payment-status-badge');
            if (statusBadge) {
                statusBadge.innerHTML = '<span class="badge bg-danger">Rejected</span>';
            }
            
            // Update notes with rejection reason
            const notesContainer = document.getElementById('notes-container');
            document.getElementById('payment-notes').textContent = reason.trim();
            notesContainer.classList.remove('d-none');
            
            // Hide the action buttons
            const approvePaymentBtn = document.getElementById('approvePaymentBtn');
            const rejectPaymentBtn = document.getElementById('rejectPaymentBtn');
            if (approvePaymentBtn && rejectPaymentBtn) {
                approvePaymentBtn.classList.add('d-none');
                rejectPaymentBtn.classList.add('d-none');
            }
            
            showAlert('success', 'Payment rejected successfully');
            
            // Update the payments list
            await loadPayments();
            
            // Don't close the modal immediately so the user can see the status change
            setTimeout(() => {
                const modal = bootstrap.Modal.getInstance(document.getElementById('paymentDetailsModal'));
                if (modal) modal.hide();
            }, 1500);
        } else {
            showAlert('danger', 'Error rejecting payment: ' + response.data.message);
        }
    } catch (error) {
        console.error('Error rejecting payment:', error);
        showAlert('danger', 'Failed to connect to server. Please try again later.');
    }
}

// Export payments function
function exportPayments() {
    // For now, just show an alert
    showAlert('info', 'Export functionality will be implemented in the full version');
}

// Function to set up pagination controls with more options
function setupPagination(totalItems, itemsPerPage, currentPage) {
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    const pagination = document.getElementById('pagination');
    
    let paginationHTML = '';
    
    // Previous button
    paginationHTML += `
        <li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
            <a class="page-link" href="?page=${currentPage - 1}" ${currentPage === 1 ? 'tabindex="-1" aria-disabled="true"' : ''}>
                Previous
            </a>
        </li>
    `;
    
    // First page
    paginationHTML += `
        <li class="page-item ${currentPage === 1 ? 'active' : ''}">
            <a class="page-link" href="?page=1">1</a>
        </li>
    `;
    
    // Ellipsis if needed after first page
    if (currentPage > 3) {
        paginationHTML += `
            <li class="page-item disabled">
                <span class="page-link">...</span>
            </li>
        `;
    }
    
    // Pages around current page
    for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
        if (i <= 0 || i >= totalPages + 1) continue;
        paginationHTML += `
            <li class="page-item ${currentPage === i ? 'active' : ''}">
                <a class="page-link" href="?page=${i}">${i}</a>
            </li>
        `;
    }
    
    // Ellipsis if needed before last page
    if (currentPage < totalPages - 2) {
        paginationHTML += `
            <li class="page-item disabled">
                <span class="page-link">...</span>
            </li>
        `;
    }
    
    // Last page (if more than one page)
    if (totalPages > 1) {
        paginationHTML += `
            <li class="page-item ${currentPage === totalPages ? 'active' : ''}">
                <a class="page-link" href="?page=${totalPages}">${totalPages}</a>
            </li>
        `;
    }
    
    // Next button
    paginationHTML += `
        <li class="page-item ${currentPage === totalPages || totalPages === 0 ? 'disabled' : ''}">
            <a class="page-link" href="?page=${currentPage + 1}" ${currentPage === totalPages || totalPages === 0 ? 'tabindex="-1" aria-disabled="true"' : ''}>
                Next
            </a>
        </li>
    `;
    
    // Items per page selector
    paginationHTML += `
        <li class="ms-3 d-flex align-items-center">
            <select id="items-per-page" class="form-select form-select-sm">
                <option value="10" ${itemsPerPage === 10 ? 'selected' : ''}>10 per page</option>
                <option value="25" ${itemsPerPage === 25 ? 'selected' : ''}>25 per page</option>
                <option value="50" ${itemsPerPage === 50 ? 'selected' : ''}>50 per page</option>
                <option value="100" ${itemsPerPage === 100 ? 'selected' : ''}>100 per page</option>
            </select>
        </li>
    `;
    
    pagination.innerHTML = paginationHTML;
    
    // Add event listener to page links
    const pageLinks = pagination.querySelectorAll('.page-link');
    pageLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            if (!this.parentElement.classList.contains('disabled') && !this.parentElement.classList.contains('active')) {
                e.preventDefault();
                const url = new URL(this.href);
                const page = url.searchParams.get('page');
                if (page) {
                    // Update URL and reload payments
                    const newUrl = new URL(window.location.href);
                    newUrl.searchParams.set('page', page);
                    window.history.pushState({path: newUrl.href}, '', newUrl.href);
                    loadPayments();
                }
            }
        });
    });
    
    // Add event listener to items per page selector
    const itemsPerPageSelector = document.getElementById('items-per-page');
    if (itemsPerPageSelector) {
        itemsPerPageSelector.addEventListener('change', function() {
            const newItemsPerPage = parseInt(this.value);
            localStorage.setItem('paymentsItemsPerPage', newItemsPerPage);
            
            // Reset to page 1 with new items per page
            const newUrl = new URL(window.location.href);
            newUrl.searchParams.set('page', 1);
            window.history.pushState({path: newUrl.href}, '', newUrl.href);
            
            loadPayments();
        });
    }
    
    // Display pagination info
    const paginationInfo = document.createElement('div');
    paginationInfo.className = 'col-12 text-center mt-2 text-muted small';
    paginationInfo.innerHTML = `Showing ${Math.min(totalItems, 1 + (currentPage - 1) * itemsPerPage)}-${Math.min(totalItems, currentPage * itemsPerPage)} of ${totalItems} payments`;
    pagination.parentNode.appendChild(paginationInfo);
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

// Helper function to get payment status class
function getPaymentStatusClass(status) {
    switch (status.toLowerCase()) {
        case 'paid':
            return 'bg-success';
        case 'rejected':
            return 'bg-danger';
        case 'pending_approval':
            return 'bg-warning';
        case 'pending':
            return 'bg-secondary';
        default:
            return 'bg-secondary';
    }
}

// Helper function to get payment status text
function getPaymentStatusText(status) {
    switch (status.toLowerCase()) {
        case 'paid':
            return 'Approved';
        case 'rejected':
            return 'Rejected';
        case 'pending_approval':
            return 'Pending Approval';
        case 'pending':
            return 'Pending';
        default:
            return capitalizeFirstLetter(status);
    }
}

// Helper function to capitalize first letter
function capitalizeFirstLetter(string) {
    if (!string) return '';
    return string.charAt(0).toUpperCase() + string.slice(1).replace('_', ' ');
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
    if (main) {
        main.insertBefore(alertElement, main.firstChild.nextSibling);
        
        // Auto-dismiss after 5 seconds
        setTimeout(() => {
            if (alertElement.parentNode) {
                if (typeof bootstrap !== 'undefined' && bootstrap.Alert) {
                    const bsAlert = new bootstrap.Alert(alertElement);
                    bsAlert.close();
                } else {
                    if (alertElement.parentNode) {
                        alertElement.parentNode.removeChild(alertElement);
                    }
                }
            }
        }, 5000);
    } else {
        console.error('Main content element not found');
        console.log('Alert message:', message);
    }
} 