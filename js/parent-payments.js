document.addEventListener('DOMContentLoaded', function() {
    console.log('Parent payments page initialized');
    
    // Load students for current parent
    loadStudents();
    
    // Setup student selector change event
    document.getElementById('student-selector').addEventListener('change', function() {
        const studentId = this.value;
        loadStudentPayments(studentId);
        setupPaymentForm(studentId);
    });
    
    // Setup payment type change event
    document.getElementById('payment-type').addEventListener('change', function() {
        updatePaymentAmount(this.value);
    });
    
    // Setup payment form submission
    document.getElementById('payment-form').addEventListener('submit', handlePaymentSubmission);
    
    // Setup receipt file upload
    document.getElementById('receipt-file').addEventListener('change', function() {
        // Store selected file for later submission
        this.dataset.fileName = this.files[0]?.name || '';
    });
});

// Load students for current parent
async function loadStudents() {
    try {
        const user = getCurrentUser();
        
        if (!user) {
            return;
        }
        
        const response = await axios.get('../api/student.php', {
            params: {
                operation: 'getStudentsByParent',
                parent_id: user.id
            }
        });
        
        const studentSelector = document.getElementById('student-selector');
        const noStudentsMessage = document.getElementById('no-students-message');
        const paymentFormSection = document.getElementById('payment-form-section');
        
        if (response.data.status === 'success') {
            const students = response.data.data;
            
            if (students.length === 0) {
                // Show no students message
                noStudentsMessage.classList.remove('d-none');
                paymentFormSection.classList.add('d-none');
                document.getElementById('student-selector-container').classList.add('d-none');
                document.getElementById('payment-history-container').innerHTML = `
                    <div class="alert alert-warning">
                        <p>No students enrolled. Please enroll a student first before making payments.</p>
                    </div>
                `;
                return;
            }
            
            // Hide no students message
            noStudentsMessage.classList.add('d-none');
            
            // Populate student selector
            let options = '<option selected disabled>Select a student</option>';
            
            students.forEach(student => {
                options += `<option value="${student.id}">${student.name} - ${student.level_name || 'Not assigned'}</option>`;
            });
            
            studentSelector.innerHTML = options;
            
            // Check if student_id is in URL parameters
            const urlParams = new URLSearchParams(window.location.search);
            const studentId = urlParams.get('student_id');
            
            if (studentId) {
                // Find if this student belongs to parent
                const studentExists = students.find(s => s.id == studentId);
                
                if (studentExists) {
                    studentSelector.value = studentId;
                    loadStudentPayments(studentId);
                    setupPaymentForm(studentId);
                }
            }
        } else {
            showAlert('danger', `Error loading students: ${response.data.message}`);
        }
    } catch (error) {
        console.error('Error loading students:', error);
        showAlert('danger', 'Error connecting to server. Please try again later.');
    }
}

// Load payment history for selected student
async function loadStudentPayments(studentId) {
    if (!studentId) {
        document.getElementById('payment-history-container').innerHTML = `
            <div class="alert alert-warning">
                <i class="bi bi-exclamation-triangle-fill me-2"></i>
                Please select a student to view payment history.
            </div>
        `;
        return;
    }
    
    try {
        const user = getCurrentUser();
        
        if (!user) {
            document.getElementById('payment-history-container').innerHTML = `
                <div class="alert alert-danger">
                    <i class="bi bi-x-circle-fill me-2"></i>
                    User session expired. Please log in again.
                </div>
            `;
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
        
        // Show loading state
        document.getElementById('payment-history-container').innerHTML = `
            <div class="d-flex justify-content-center my-4">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
            </div>
        `;
        
        // Get payment history for this parent
        const response = await axios.get('../api/payment.php', config);
        
        if (response.data.status === 'success') {
            const allPayments = response.data.data;
            // Filter payments for the selected student
            const studentPayments = allPayments.filter(payment => payment.student_id == studentId);
            
            if (studentPayments.length === 0) {
                document.getElementById('payment-history-container').innerHTML = `
                    <div class="alert alert-info">
                        <i class="bi bi-info-circle-fill me-2"></i>
                        No payment history found for this student.
                    </div>
                `;
                return;
            }
            
            // Sort payments by date (most recent first)
            studentPayments.sort((a, b) => new Date(b.payment_date) - new Date(a.payment_date));
            
            // Get page from URL or default to 1
            const urlParams = new URLSearchParams(window.location.search);
            let currentPage = parseInt(urlParams.get('page')) || 1;
            const itemsPerPage = 5; // Default items per page
            
            // Calculate total pages
            const totalPages = Math.ceil(studentPayments.length / itemsPerPage);
            
            // Ensure current page is valid
            if (currentPage < 1) currentPage = 1;
            if (currentPage > totalPages) currentPage = totalPages;
            
            // Get payments for current page
            const startIndex = (currentPage - 1) * itemsPerPage;
            const endIndex = Math.min(startIndex + itemsPerPage, studentPayments.length);
            const paymentsToShow = totalPages > 1 ? studentPayments.slice(startIndex, endIndex) : studentPayments;
            
            let html = '';
            
            // Add summary header
            html += `
                <div class="d-flex justify-content-between align-items-center mb-3">
                    <h5 class="mb-0">Showing ${startIndex + 1} to ${endIndex} of ${studentPayments.length} payments</h5>
                    <div class="btn-group">
                        <button class="btn btn-sm btn-outline-primary" id="view-all-payments" 
                            ${totalPages <= 1 ? 'disabled' : ''}>
                            <i class="bi bi-list"></i> View All
                        </button>
                        <button class="btn btn-sm btn-outline-secondary" id="export-payments">
                            <i class="bi bi-download"></i> Export
                        </button>
                    </div>
                </div>
            `;
            
            // Display the payments
            paymentsToShow.forEach(payment => {
                // Determine card style based on payment status
                let cardClass = 'payment-pending';
                if (payment.payment_status === 'paid') {
                    cardClass = 'payment-approved';
                } else if (payment.payment_status === 'rejected') {
                    cardClass = 'payment-rejected';
                }
                
                // Format date
                const paymentDate = payment.payment_date 
                    ? new Date(payment.payment_date).toLocaleDateString('en-US', {
                        year: 'numeric', 
                        month: 'short', 
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                    }) 
                    : 'N/A';
                
                // Format payment type name
                const paymentTypeName = payment.payment_type_name || 'Unknown payment type';
                
                // Format amount with currency
                const formattedAmount = payment.payment_amount 
                    ? `₱${parseFloat(payment.payment_amount).toLocaleString('en-US', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                    })}` 
                    : 'N/A';
                
                html += `
                    <div class="card mb-3 payment-history-card ${cardClass}">
                        <div class="card-body">
                            <div class="row">
                                <div class="col-md-8">
                                    <h5 class="card-title">${paymentTypeName}</h5>
                                    <h6 class="card-subtitle mb-2 text-muted">${paymentDate}</h6>
                                    <p class="card-text">
                                        Amount: ${formattedAmount}<br>
                                        Method: ${payment.payment_method || 'N/A'}<br>
                                        Reference: ${payment.payment_reference || 'N/A'}
                                    </p>
                                </div>
                                <div class="col-md-4 text-end d-flex flex-column justify-content-between">
                                    <span class="badge rounded-pill bg-${getStatusBadgeClass(payment.payment_status)} mb-3">
                                        ${getStatusText(payment.payment_status)}
                                    </span>
                                    ${payment.payment_receipt ? `
                                        <a href="../uploads/receipts/${payment.payment_receipt}" target="_blank" class="btn btn-sm btn-outline-primary">
                                            <i class="bi bi-receipt"></i> View Receipt
                                        </a>
                                    ` : ''}
                                </div>
                            </div>
                        </div>
                    </div>
                `;
            });
            
            // Add pagination if needed
            if (totalPages > 1) {
                html += `<nav aria-label="Payment history pagination">
                    <ul class="pagination justify-content-center">
                        <li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
                            <button class="page-link" data-page="${currentPage - 1}">Previous</button>
                        </li>`;
                
                // Show first page
                html += `<li class="page-item ${currentPage === 1 ? 'active' : ''}">
                        <button class="page-link" data-page="1">1</button>
                    </li>`;
                
                // Add ellipsis if needed
                if (currentPage > 3) {
                    html += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
                }
                
                // Show pages around current page
                for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
                    html += `<li class="page-item ${currentPage === i ? 'active' : ''}">
                            <button class="page-link" data-page="${i}">${i}</button>
                        </li>`;
                }
                
                // Add ellipsis if needed
                if (currentPage < totalPages - 2) {
                    html += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
                }
                
                // Show last page if more than 1 page
                if (totalPages > 1) {
                    html += `<li class="page-item ${currentPage === totalPages ? 'active' : ''}">
                            <button class="page-link" data-page="${totalPages}">${totalPages}</button>
                        </li>`;
                }
                
                html += `<li class="page-item ${currentPage === totalPages ? 'disabled' : ''}">
                            <button class="page-link" data-page="${currentPage + 1}">Next</button>
                        </li>
                    </ul>
                </nav>`;
            }
            
            document.getElementById('payment-history-container').innerHTML = html;
            
            // Add click event for pagination
            document.querySelectorAll('.pagination .page-link').forEach(link => {
                link.addEventListener('click', function() {
                    if (!this.parentElement.classList.contains('disabled') && !this.parentElement.classList.contains('active')) {
                        const page = this.dataset.page;
                        if (page) {
                            loadStudentPaymentsPage(studentId, parseInt(page));
                        }
                    }
                });
            });
            
            // Add click event for view all button
            const viewAllBtn = document.getElementById('view-all-payments');
            if (viewAllBtn) {
                viewAllBtn.addEventListener('click', function() {
                    loadStudentPaymentsPage(studentId, 0, true); // 0 means show all
                });
            }
            
            // Add click event for export button
            const exportBtn = document.getElementById('export-payments');
            if (exportBtn) {
                exportBtn.addEventListener('click', function() {
                    exportPaymentHistory(studentPayments);
                });
            }
        } else {
            document.getElementById('payment-history-container').innerHTML = `
                <div class="alert alert-danger">
                    <i class="bi bi-x-circle-fill me-2"></i>
                    Error loading payment history: ${response.data.message}
                </div>
            `;
        }
    } catch (error) {
        console.error('Error loading payment history:', error);
        document.getElementById('payment-history-container').innerHTML = `
            <div class="alert alert-danger">
                <i class="bi bi-x-circle-fill me-2"></i>
                Error connecting to server. Please try again later.
            </div>
        `;
    }
}

// Load specific page of student payments
function loadStudentPaymentsPage(studentId, page, showAll = false) {
    // Update URL parameter
    const url = new URL(window.location.href);
    if (showAll) {
        url.searchParams.delete('page');
        url.searchParams.set('show_all', 'true');
    } else {
        url.searchParams.set('page', page);
        url.searchParams.delete('show_all');
    }
    window.history.pushState({}, '', url);
    
    // Reload payments with updated URL parameters
    loadStudentPayments(studentId);
}

// Export payment history to CSV
function exportPaymentHistory(payments) {
    if (!payments || payments.length === 0) {
        showAlert('warning', 'No payment data to export');
        return;
    }
    
    // Create CSV content
    let csvContent = "data:text/csv;charset=utf-8,";
    
    // Add headers
    csvContent += "ID,Date,Type,Amount,Method,Reference,Status\n";
    
    // Add data rows
    payments.forEach(payment => {
        const date = payment.payment_date ? new Date(payment.payment_date).toLocaleDateString() : 'N/A';
        const status = getStatusText(payment.payment_status);
        const amount = payment.payment_amount ? parseFloat(payment.payment_amount).toFixed(2) : '0.00';
        
        const row = [
            payment.id || '',
            date,
            payment.payment_type_name || 'Unknown',
            amount,
            payment.payment_method || 'N/A',
            payment.payment_reference || 'N/A',
            status
        ];
        
        // Escape any commas in the data
        const escapedRow = row.map(field => {
            if (field.toString().includes(',')) {
                return `"${field}"`;
            }
            return field;
        });
        
        csvContent += escapedRow.join(',') + "\n";
    });
    
    // Create download link
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `payment_history_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    
    // Download file
    link.click();
    
    // Clean up
    document.body.removeChild(link);
    
    showAlert('success', 'Payment history exported successfully');
}

// Setup payment form for a selected student
async function setupPaymentForm(studentId) {
    if (!studentId) {
        return;
    }
    
    try {
        const user = getCurrentUser();
        
        if (!user) {
            return; // Already handled in loadStudentPayments
        }
        
        // Show payment form section
        document.getElementById('payment-form-section').classList.remove('d-none');
        
        // Set student ID in hidden field
        const studentIdField = document.getElementById('student-id');
        if (studentIdField) {
            studentIdField.value = studentId;
            console.log("Set student ID in form:", studentId);
        } else {
            console.error("Could not find student-id hidden field");
        }
        
        // Load payment types with auth headers
        const response = await axios.get('../api/payment.php', {
            params: {
                operation: 'getPaymentTypes'
            },
            headers: {
                'X-Auth-User': user.id.toString(),
                'X-Auth-Role': user.role
            }
        });
        
        if (response.data && response.data.status === 'success') {
            const paymentTypes = response.data.data || [];
            const paymentTypeSelect = document.getElementById('payment-type');
            
            // Populate payment types dropdown
            let options = '<option value="" selected disabled>Select payment type</option>';
            
            paymentTypes.forEach(type => {
                options += `<option value="${type.id}" data-amount="${type.amount}">${type.name} - ₱${type.amount}</option>`;
            });
            
            paymentTypeSelect.innerHTML = options;
            
            // Reset form fields
            document.getElementById('amount').value = '';
            document.getElementById('payment-method').value = '';
            document.getElementById('reference-number').value = '';
            document.getElementById('receipt-file').value = '';
            document.getElementById('payment-notes').value = '';
        } else {
            const errorMessage = response.data && response.data.message ? response.data.message : 'Unknown error';
            showAlert('danger', `Error loading payment types: ${errorMessage}`);
        }
    } catch (error) {
        console.error('Error setting up payment form:', error);
        showAlert('danger', 'Error connecting to server. Please try again later.');
    }
}

// Update payment amount based on selected payment type
function updatePaymentAmount(paymentTypeId) {
    const paymentTypeSelect = document.getElementById('payment-type');
    const amountInput = document.getElementById('amount');
    
    if (!paymentTypeId) {
        amountInput.value = '';
        return;
    }
    
    // Find the selected option
    const selectedOption = paymentTypeSelect.querySelector(`option[value="${paymentTypeId}"]`);
    
    if (selectedOption) {
        // Get the amount from data attribute
        const amount = selectedOption.dataset.amount;
        amountInput.value = amount;
    }
}

// Handle payment form submission
async function handlePaymentSubmission(event) {
    event.preventDefault();
    console.log('=== PAYMENT SUBMISSION START ===');
    
    // Get form values
    const studentId = document.getElementById('student-id').value;
    const paymentTypeId = document.getElementById('payment-type').value;
    const amount = document.getElementById('amount').value;
    const paymentMethod = document.getElementById('payment-method').value;
    const referenceNumber = document.getElementById('reference-number').value;
    const notes = document.getElementById('payment-notes').value;
    const receiptFile = document.getElementById('receipt-file').files[0];
    
    console.log('Form values retrieved');
    
    // Validate form
    if (!studentId || !paymentTypeId || !amount || !paymentMethod) {
        showAlert('danger', 'Please fill all required fields.');
        return;
    }
    
    // If payment method is not Cash, reference number is required
    if (paymentMethod !== 'Cash' && !referenceNumber) {
        showAlert('danger', 'Reference number is required for online payments.');
        return;
    }
    
    try {
        const user = getCurrentUser();
        
        if (!user) {
            showAlert('danger', 'Authentication required. Please log in again.');
            setTimeout(() => {
                window.location.href = '../login.html';
            }, 2000);
            return;
        }
        
        // Add auth headers
        const authHeaders = {
            'X-Auth-User': user.id.toString(),
            'X-Auth-Role': user.role
        };
        
        let receiptFilename = null;
        
        // Upload receipt file if provided
        if (receiptFile) {
            console.log('Uploading receipt file');
            
            // Show upload progress modal
            const progressModal = new bootstrap.Modal(document.getElementById('uploadProgressModal'));
            progressModal.show();
            
            // Set initial progress
            const progressBar = document.querySelector('#uploadProgressModal .progress-bar');
            const statusText = document.getElementById('upload-status-text');
            progressBar.style.width = '0%';
            statusText.textContent = 'Preparing to upload...';
            
            // Create form data for file upload
            const fileFormData = new FormData();
            fileFormData.append('operation', 'uploadReceipt');
            fileFormData.append('student_id', studentId);
            fileFormData.append('receipt', receiptFile);
            
            // Upload file with auth headers
            const uploadResponse = await axios.post('../api/payment.php', fileFormData, {
                headers: authHeaders,
                onUploadProgress: progressEvent => {
                    const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                    progressBar.style.width = `${percentCompleted}%`;
                    statusText.textContent = `Uploading... ${percentCompleted}%`;
                }
            });
            
            if (uploadResponse.data && uploadResponse.data.status === 'success') {
                receiptFilename = uploadResponse.data.filename;
                
                // Update progress bar to 100%
                progressBar.style.width = '100%';
                statusText.textContent = 'Upload completed successfully!';
                
                // Close modal after a short delay
                setTimeout(() => {
                    progressModal.hide();
                }, 1000);
            } else {
                progressModal.hide();
                const errorMessage = uploadResponse.data && uploadResponse.data.message ? uploadResponse.data.message : 'Unknown error';
                showAlert('danger', `Upload failed: ${errorMessage}`);
                return;
            }
        }
        
        // Prepare payment data
        const paymentData = {
            student_id: studentId,
            payment_type_id: paymentTypeId,
            amount: amount,
            payment_method: paymentMethod,
            reference_number: referenceNumber || '',
            notes: notes || '',
            receipt_filename: receiptFilename
        };
        
        // Submit payment with auth headers
        const formData = new FormData();
        formData.append('operation', 'submitPayment');
        formData.append('json', JSON.stringify(paymentData));
        
        // Alternative way of sending data as direct form fields instead of JSON
        formData.append('student_id', studentId);
        formData.append('payment_type_id', paymentTypeId);
        formData.append('amount', amount);
        formData.append('payment_method', paymentMethod);
        if (referenceNumber) formData.append('reference_number', referenceNumber);
        if (notes) formData.append('notes', notes);
        if (receiptFilename) formData.append('receipt_filename', receiptFilename);
        
        const response = await axios.post('../api/payment.php', formData, {
            headers: authHeaders
        });
        
        if (response.data && response.data.status === 'success') {
            console.log('Payment submission succeeded');
            
            // Reset the form first to ensure clean state
            document.getElementById('payment-form').reset();
            
            // Reload payment history
            loadStudentPayments(studentId);
            
            // Show a simple success alert instead of dealing with the modal
            try {
                // Try to show modal first
                const modalElement = document.getElementById('paymentSuccessModal');
                if (modalElement) {
                    const successModal = new bootstrap.Modal(modalElement);
                    successModal.show();
                } else {
                    // Fallback to alert
                    showAlert('success', 'Payment submitted successfully! It will be reviewed by the administration.');
                }
            } catch (error) {
                // If modal fails, show alert
                showAlert('success', 'Payment submitted successfully! It will be reviewed by the administration.');
            }
            
        } else {
            const errorMessage = response.data && response.data.message ? response.data.message : 'Unknown error';
            showAlert('danger', `Payment submission failed: ${errorMessage}`);
        }
    } catch (error) {
        console.error('Payment submission error:', error);
        showAlert('danger', `Error connecting to server: ${error.response?.data?.message || error.message || 'Unknown error'}`);
    } finally {
        console.log('=== PAYMENT SUBMISSION END ===');
    }
}

// Helper function to get status badge class
function getStatusBadgeClass(status) {
    if (!status) return 'secondary';
    
    switch (status.toLowerCase()) {
        case 'paid':
            return 'success';
        case 'rejected':
            return 'danger';
        case 'pending_approval':
            return 'warning';
        case 'pending':
            return 'secondary';
        default:
            return 'secondary';
    }
}

// Helper function to get status text
function getStatusText(status) {
    if (!status) return 'Pending';
    
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
            return capitalizeFirstLetter(status.replace('_', ' '));
    }
}

// Helper function to capitalize first letter
function capitalizeFirstLetter(string) {
    if (!string) return '';
    return string.charAt(0).toUpperCase() + string.slice(1);
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
    
    // Insert after the info alert
    const infoAlert = document.querySelector('.alert-info');
    infoAlert.parentNode.insertBefore(alertDiv, infoAlert.nextSibling);
    
    // Auto dismiss after 5 seconds
    setTimeout(() => {
        if (alertDiv.parentNode) {
            const bsAlert = new bootstrap.Alert(alertDiv);
            bsAlert.close();
        }
    }, 5000);
} 