document.addEventListener('DOMContentLoaded', async function() {
    // Get student ID from URL
    const urlParams = new URLSearchParams(window.location.search);
    const studentId = urlParams.get('id');
    
    if (!studentId) {
        showAlert('danger', 'No student ID provided');
        return;
    }
    
    // Load student details
    await loadStudentDetails(studentId);
    
    // Load payment information
    await loadPaymentInformation(studentId);
    
    // Initialize document viewer
    initDocumentViewer();
    
    // Set up event listeners
    const approveBtn = document.getElementById('approveBtn');
    if (approveBtn) {
        approveBtn.addEventListener('click', () => approveEnrollment(studentId));
    }
    
    const rejectBtn = document.getElementById('rejectBtn');
    if (rejectBtn) {
        rejectBtn.addEventListener('click', () => rejectEnrollment(studentId));
    }
    
    const printBtn = document.getElementById('printBtn');
    if (printBtn) {
        printBtn.addEventListener('click', () => window.print());
    }
    
    const exportBtn = document.getElementById('exportBtn'); 
    if (exportBtn) {
        exportBtn.addEventListener('click', () => exportEnrollmentDetails(studentId));
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

// Initialize document viewer modal functionality
function initDocumentViewer() {
    // Find all document preview images
    const documentPreviews = document.querySelectorAll('.document-preview');
    
    // Add click event to each preview
    documentPreviews.forEach(preview => {
        preview.addEventListener('click', function() {
            if (this.src && this.src !== window.location.href) {
                openDocumentViewer(this.src, this.alt);
            }
        });
        
        // Add cursor pointer style to make it clear it's clickable
        preview.style.cursor = 'pointer';
        
        // Add a small zoom icon to indicate it can be viewed larger
        const previewContainer = preview.parentElement;
        if (previewContainer && !previewContainer.querySelector('.zoom-icon')) {
            const zoomIcon = document.createElement('div');
            zoomIcon.className = 'zoom-icon position-absolute top-0 end-0 p-2';
            zoomIcon.innerHTML = '<i class="bi bi-zoom-in text-primary" style="font-size: 1.2rem;"></i>';
            zoomIcon.style.cursor = 'pointer';
            zoomIcon.addEventListener('click', function(e) {
                e.stopPropagation();
                if (preview.src && preview.src !== window.location.href) {
                    openDocumentViewer(preview.src, preview.alt);
                }
            });
            previewContainer.style.position = 'relative';
            previewContainer.appendChild(zoomIcon);
        }
    });
}

// Open document viewer modal with the specified image
function openDocumentViewer(src, title) {
    // Get modal elements
    const modal = new bootstrap.Modal(document.getElementById('documentViewerModal'));
    const modalTitle = document.getElementById('documentViewerModalLabel');
    const modalImage = document.getElementById('fullDocumentImage');
    const errorAlert = document.getElementById('documentLoadError');
    const downloadLink = document.getElementById('documentDownloadLink');
    
    // Set title
    modalTitle.textContent = `View ${title || 'Document'}`;
    
    // Hide previous error
    errorAlert.classList.add('d-none');
    
    // Set download link
    downloadLink.href = src;
    
    // Show loading state
    modalImage.src = '';
    
    // Load the image
    modalImage.onload = function() {
        // Success - show image, hide error
        errorAlert.classList.add('d-none');
    };
    
    modalImage.onerror = function() {
        // Error - hide image, show error
        errorAlert.classList.remove('d-none');
    };
    
    // Set source to trigger load
    modalImage.src = src;
    
    // Show the modal
    modal.show();
}

// Load student details
async function loadStudentDetails(studentId) {
    try {
        const user = getCurrentUser();
        if (!user) {
            window.location.href = '../login.html';
            return;
        }
        
        // Get student details
        const response = await axios.get('../api/student.php', {
            params: {
                operation: 'getStudentById',
                id: studentId
            },
            headers: {
                'X-Auth-User': user.id.toString(),
                'X-Auth-Role': user.role
            }
        });
        
        if (response.data.status === 'success') {
            // The API returns nested data structure with student, emergency, enrollment, and documents
            const data = response.data.data;
            const student = data.student;
            
            // Update student information - with safe element references
            updateElementText('student-name', student.name);
            updateElementText('student-birthdate', student.birthdate ? new Date(student.birthdate).toLocaleDateString() : 'N/A');
            updateElementText('student-age', student.age);
            updateElementText('student-gender', student.gender);
            updateElementText('student-level', student.level_name || 'Not assigned');
            updateElementText('student-schedule', student.schedule);
            updateElementText('student-previous-school', student.previous_school || 'N/A');
            updateElementText('student-address', student.address);
            
            // Update parent information from emergency contact data
            // Check all possible sources of emergency contact information
            const emergency = data.emergency_contact || data.emergency;
            const parent = data.parent;
            
            // First try to get data from the directly included fields in student data
            // (the API now merges this data into the student object)
            updateElementText('parent-name', student.guardian_name || (emergency?.guardian_name) || (parent?.name) || 'N/A');
            updateElementText('parent-email', student.email || (emergency?.email) || (parent?.email) || 'N/A');
            updateElementText('parent-contact', student.contact_number || (emergency?.contact_number) || (parent?.phone) || 'N/A');
            updateElementText('emergency-contact-name', student.emergency_contact_name || (emergency?.emergency_contact_name) || 'N/A');
            updateElementText('emergency-contact-number', student.emergency_contact_number || (emergency?.emergency_contact_number) || 'N/A');
            updateElementText('parent-relationship', student.relationship || (emergency?.relationship) || 'Parent');
            
            // Update enrollment status
            const enrollment = data.enrollment;
            const statusBadge = document.getElementById('enrollment-status');
            if (statusBadge) {
                const status = student.enrollment_status || 'pending';
                statusBadge.textContent = status.charAt(0).toUpperCase() + status.slice(1);
                statusBadge.className = 'badge ' + getStatusBadgeClass(status);
            }
            
            updateElementText('enrollment-date', enrollment?.enrollment_date ? new Date(enrollment.enrollment_date).toLocaleDateString() : 'N/A');
            
            // Display admin comments (especially important for rejected applications)
            if (student.admin_comments) {
                updateElementText('admin-comments', student.admin_comments);
            } else {
                updateElementText('admin-comments', 'None');
            }
            
            // Update document statuses
            const documents = data.documents;
            if (documents) {
                updateDocumentStatus('birth-cert', documents.birth_certificate_status, documents.birth_certificate_file);
                updateDocumentStatus('id-picture', documents.id_picture_status, documents.id_picture_file);
                updateDocumentStatus('medical-cert', documents.medical_certificate_status, documents.medical_certificate_file);
                updateDocumentStatus('report-card', documents.report_card_status, documents.report_card_file);
            }
            
            // Update button states based on enrollment status
            updateActionButtons(student.enrollment_status);
            
            // Log the full data received for debugging
            console.log("API response data:", data);
        } else {
            showAlert('danger', 'Error loading student details: ' + response.data.message);
        }
    } catch (error) {
        console.error('Error loading student details:', error);
        showAlert('danger', 'Failed to connect to server. Please try again later.');
    }
}

// Helper function to safely update element text content
function updateElementText(elementId, text) {
    const element = document.getElementById(elementId);
                if (element) {
        element.textContent = text;
    }
}

// Update document status and preview
function updateDocumentStatus(documentType, status, filePath) {
    const statusBadge = document.getElementById(`${documentType}-status`);
    const preview = document.getElementById(`${documentType}-preview`);
    
    if (!statusBadge || !preview) {
        return;
    }
    
    if (status) {
        statusBadge.textContent = 'Uploaded';
        statusBadge.className = 'badge bg-success';
        if (filePath) {
            preview.src = '../uploads/documents/' + filePath;
            preview.style.display = 'block';
            
            // Make sure it's clickable
            preview.style.cursor = 'pointer';
            preview.alt = documentTypeToName(documentType);
            
            // Add caption to indicate it's clickable
            const previewCaption = document.createElement('small');
            previewCaption.className = 'text-muted d-block mt-1';
            previewCaption.textContent = 'Click to view full size';
            
            // Only add if not already present
            if (preview.nextElementSibling?.tagName !== 'SMALL') {
                preview.parentNode.insertBefore(previewCaption, preview.nextSibling);
            }
        } else {
            preview.style.display = 'none';
        }
    } else {
        statusBadge.textContent = 'Not Uploaded';
        statusBadge.className = 'badge bg-danger';
        preview.style.display = 'none';
    }
}

// Helper function to convert document type to readable name
function documentTypeToName(documentType) {
    switch (documentType) {
        case 'birth-cert':
            return 'Birth Certificate';
        case 'id-picture':
            return 'ID Picture';
        case 'medical-cert':
            return 'Medical Certificate';
        case 'report-card':
            return 'Report Card';
        default:
            return 'Document';
    }
}

// Get status badge class
function getStatusBadgeClass(status) {
    switch (status) {
        case 'enrolled':
            return 'bg-success';
        case 'rejected':
            return 'bg-danger';
        default:
            return 'bg-warning';
    }
}

// Update action buttons based on enrollment status
function updateActionButtons(status) {
    const approveBtn = document.getElementById('approveBtn');
    const rejectBtn = document.getElementById('rejectBtn');
    
    if (!approveBtn || !rejectBtn) {
        return;
    }
    
    if (status === 'enrolled' || status === 'rejected') {
        approveBtn.disabled = true;
        rejectBtn.disabled = true;
    } else {
        approveBtn.disabled = false;
        rejectBtn.disabled = false;
    }
}

// Approve enrollment
async function approveEnrollment(studentId) {
    try {
        const user = getCurrentUser();
        if (!user) return;
        
        showAlert('info', 'Processing enrollment approval...');
        
        // Prepare the JSON data for the API
        const enrollmentData = {
            student_id: studentId,
            admin_id: user.id,
            status: 'enrolled',
            section_id: null // This could be populated if section assignment is implemented
        };
        
        // Convert to FormData
        const formData = new FormData();
        formData.append('operation', 'updateEnrollmentStatus');
        formData.append('json', JSON.stringify(enrollmentData));
        
        // Make the actual API call
        const response = await axios.post('../api/student.php', formData, {
            headers: {
                'X-Auth-User': user.id.toString(),
                'X-Auth-Role': user.role
            }
        });
        
        if (response.data.status === 'success') {
            // Update UI to reflect approved status
            const statusBadge = document.getElementById('enrollment-status');
            if (statusBadge) {
                statusBadge.textContent = 'Enrolled';
                statusBadge.className = 'badge bg-success';
            }
            
            // Update button states
            const approveBtn = document.getElementById('approveBtn');
            const rejectBtn = document.getElementById('rejectBtn');
            if (approveBtn && rejectBtn) {
                approveBtn.disabled = true;
                rejectBtn.disabled = true;
            }
            
            showAlert('success', 'Enrollment approved successfully!');
        } else {
            showAlert('danger', 'Error approving enrollment: ' + response.data.message);
        }
    } catch (error) {
        console.error('Error approving enrollment:', error);
        showAlert('danger', 'Failed to connect to server. Please try again later.');
    }
}

// Reject enrollment
async function rejectEnrollment(studentId) {
    try {
        const user = getCurrentUser();
        if (!user) return;
        
        // For a better UX, we can add a simple prompt for rejection reason
        const reason = prompt('Please provide a reason for rejecting this enrollment:');
        if (reason === null) {
            // User cancelled the prompt
            return;
        }
        
        if (reason.trim() === '') {
            showAlert('warning', 'A reason is required to reject the enrollment');
            return;
        }
        
        showAlert('info', 'Processing enrollment rejection...');
        
        // Prepare the JSON data for the API
        const enrollmentData = {
            student_id: studentId,
            admin_id: user.id,
            status: 'rejected',
            reason: reason.trim()
        };
        
        // Convert to FormData
        const formData = new FormData();
        formData.append('operation', 'updateEnrollmentStatus');
        formData.append('json', JSON.stringify(enrollmentData));
        
        // Make the actual API call
        const response = await axios.post('../api/student.php', formData, {
            headers: {
                'X-Auth-User': user.id.toString(),
                'X-Auth-Role': user.role
            }
        });
        
        if (response.data.status === 'success') {
            // Update UI to reflect rejected status
            const statusBadge = document.getElementById('enrollment-status');
            if (statusBadge) {
                statusBadge.textContent = 'Rejected';
                statusBadge.className = 'badge bg-danger';
            }
            
            // Update button states
            const approveBtn = document.getElementById('approveBtn');
            const rejectBtn = document.getElementById('rejectBtn');
            if (approveBtn && rejectBtn) {
                approveBtn.disabled = true;
                rejectBtn.disabled = true;
            }
            
            showAlert('success', 'Enrollment rejected successfully');
        } else {
            showAlert('danger', 'Error rejecting enrollment: ' + response.data.message);
        }
    } catch (error) {
        console.error('Error rejecting enrollment:', error);
        showAlert('danger', 'Failed to connect to server. Please try again later.');
    }
}

// Export enrollment details
function exportEnrollmentDetails(studentId) {
    // For demo purposes, just show an alert
    showAlert('info', 'Export functionality will be implemented in the full version');
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
    if (main) {
        main.insertBefore(alertElement, main.firstChild);
        
        // Auto-dismiss after 5 seconds
        setTimeout(() => {
            if (alertElement.parentNode) {
                // Check if Bootstrap is fully loaded
                if (typeof bootstrap !== 'undefined' && bootstrap.Alert) {
                    const bsAlert = new bootstrap.Alert(alertElement);
                    bsAlert.close();
                } else {
                    // Fallback if bootstrap.Alert is not available
                    if (alertElement.parentNode) {
                        alertElement.parentNode.removeChild(alertElement);
                    }
                }
            }
        }, 5000);
    } else {
        // Fallback if main element is not found
        console.error('Main content element not found');
        console.log('Alert message:', message);
    }
}

// Load payment information
async function loadPaymentInformation(studentId) {
    try {
        const user = getCurrentUser();
        if (!user) return;
        
        // First get the parent_id for this student
        const studentResponse = await axios.get('../api/student.php', {
            params: {
                operation: 'getStudentById',
                id: studentId
            },
            headers: {
                'X-Auth-User': user.id.toString(),
                'X-Auth-Role': user.role
            }
        });

        if (studentResponse.data.status !== 'success' || !studentResponse.data.data) {
            throw new Error('Failed to get student data');
        }

        const parentId = studentResponse.data.data.student.parent_id;
        if (!parentId) {
            throw new Error('No parent ID found for student');
        }
        
        // Then get payment information using parent_id
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
        
        const paymentList = document.getElementById('payment-list');
        if (!paymentList) return;
        
        if (response.data.status === 'success') {
            const allPayments = response.data.data || [];
            
            // Filter payments for the current student
            const studentPayments = allPayments.filter(payment => payment.student_id == studentId);
            
            if (studentPayments.length === 0) {
                paymentList.innerHTML = `
                    <tr>
                        <td colspan="5" class="text-center">No payment records found</td>
                    </tr>
                `;
                return;
            }
            
            // Sort payments by date (most recent first)
            studentPayments.sort((a, b) => new Date(b.payment_date || b.created_at) - new Date(a.payment_date || a.created_at));
            
            let html = '';
            studentPayments.forEach(payment => {
                const paymentDate = payment.payment_date 
                    ? new Date(payment.payment_date).toLocaleDateString() 
                    : new Date(payment.created_at).toLocaleDateString();
                
                const status = payment.payment_status || 'pending';
                const statusClass = getPaymentStatusClass(status);
                
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
                        <td>${paymentDate}</td>
                        <td>${payment.payment_type_name || 'Enrollment Fee'}</td>
                        <td>₱${payment.payment_amount || '0.00'}</td>
                        <td><span class="badge ${statusClass}">${capitalizeFirstLetter(status)}</span></td>
                        <td>${actionButtons}</td>
                    </tr>
                `;
            });
            
            paymentList.innerHTML = html;
            
            // Add event listeners to view payment buttons
            document.querySelectorAll('.view-payment').forEach(button => {
                button.addEventListener('click', () => viewPaymentDetails(button.dataset.id));
            });
        } else {
            paymentList.innerHTML = `
                <tr>
                    <td colspan="5" class="text-center text-danger">
                        Error loading payment information: ${response.data.message || 'Unknown error'}
                    </td>
                </tr>
            `;
        }
    } catch (error) {
        console.error('Error loading payment information:', error);
        const paymentList = document.getElementById('payment-list');
        if (paymentList) {
            paymentList.innerHTML = `
            <tr>
                <td colspan="5" class="text-center text-danger">
                        Failed to connect to server. Please try again later.
                </td>
            </tr>
        `;
    }
}
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
        
        // Extract basic data from the table row
        const paymentDate = paymentRow.cells[0].textContent;
        const paymentType = paymentRow.cells[1].textContent;
        const paymentAmount = paymentRow.cells[2].textContent;
        const paymentStatus = paymentRow.cells[3].querySelector('.badge').textContent;
        
        // Update payment details in modal with what we know
        updateElementText('payment-date', paymentDate);
        updateElementText('payment-amount', paymentAmount);
        updateElementText('payment-type', paymentType);
        
        // Get full payment details directly from the API
        try {
            // First get the parent_id
            const studentId = new URLSearchParams(window.location.search).get('id');
            const studentResponse = await axios.get('../api/student.php', {
                params: {
                    operation: 'getStudentById',
                    id: studentId
                },
                headers: {
                    'X-Auth-User': user.id.toString(),
                    'X-Auth-Role': user.role
                }
            });
            
            if (studentResponse.data.status === 'success') {
                const parentId = studentResponse.data.data.student.parent_id;
                
                // Get all payments for this parent
                const paymentsResponse = await axios.get('../api/payment.php', {
                    params: {
                        operation: 'getPaymentsByParent',
                        parent_id: parentId
                    },
                    headers: {
                        'X-Auth-User': user.id.toString(),
                        'X-Auth-Role': user.role
                    }
                });

                if (paymentsResponse.data.status === 'success') {
                    // Find the specific payment we're looking for
                    const payment = paymentsResponse.data.data.find(p => p.id == paymentId);
                    
                    if (payment) {
                        // Update additional details from the full payment data
                        updateElementText('payment-method', payment.payment_method || 'Bank Transfer');
                        updateElementText('payment-reference', payment.payment_reference || 'REF-' + paymentId);
                
                // Handle receipt image
                const receiptImage = document.getElementById('receiptImage');
                const receiptError = document.getElementById('receiptError');
                
                        if (receiptImage && receiptError) {
                if (payment.payment_receipt) {
                                receiptImage.src = `../uploads/receipts/${payment.payment_receipt}`;
                                receiptImage.classList.remove('d-none');
                                receiptError.classList.add('d-none');
                                
                                // Handle image load error
                                receiptImage.onerror = function() {
                                    // Try with demo receipt as fallback
                                    receiptImage.src = '../images/sample-receipt.jpg';
                                    receiptImage.onerror = function() {
                                        // If fallback also fails
                    receiptImage.classList.add('d-none');
                                        receiptError.classList.remove('d-none');
                                    };
                                };
                            } else {
                                // Use a placeholder/demo receipt image for demonstration
                                receiptImage.src = '../images/sample-receipt.jpg';
                        receiptImage.classList.remove('d-none');
                        receiptError.classList.add('d-none');
                    
                    receiptImage.onerror = function() {
                        receiptImage.classList.add('d-none');
                        receiptError.classList.remove('d-none');
                    };
                            }
                        }
                    }
                }
            }
        } catch (detailsError) {
            console.error('Error fetching additional payment details:', detailsError);
            // Continue showing the modal with basic details even if fetching additional details fails
        }
        
        // Update status badge
        const statusBadge = document.getElementById('payment-status-badge');
        if (statusBadge) {
            const statusClass = getPaymentStatusClass(paymentStatus.toLowerCase());
            statusBadge.innerHTML = `<span class="badge ${statusClass}">${paymentStatus}</span>`;
        }
        
        // Set up approve/reject buttons
        const approvePaymentBtn = document.getElementById('approvePaymentBtn');
        const rejectPaymentBtn = document.getElementById('rejectPaymentBtn');
        
        if (approvePaymentBtn && rejectPaymentBtn) {
            // Only show approve/reject buttons for pending payments
            if (paymentStatus.toLowerCase().includes('pending')) {
                approvePaymentBtn.classList.remove('d-none');
                rejectPaymentBtn.classList.remove('d-none');
                
                // Set up event listeners
                approvePaymentBtn.onclick = () => approvePayment(paymentId);
                rejectPaymentBtn.onclick = () => rejectPayment(paymentId);
            } else {
                approvePaymentBtn.classList.add('d-none');
                rejectPaymentBtn.classList.add('d-none');
            }
        }
        
        // Show modal
        const modal = new bootstrap.Modal(document.getElementById('paymentDetailsModal'));
        modal.show();
    } catch (error) {
        console.error('Error viewing payment details:', error);
        showAlert('danger', 'Failed to load payment details. Please try again later.');
    }
}

// Helper function to get payment status class
function getPaymentStatusClass(status) {
    switch (status.toLowerCase()) {
        case 'paid':
        case 'approved':
            return 'bg-success';
        case 'rejected':
            return 'bg-danger';
        case 'pending':
        case 'pending_approval':
            return 'bg-warning';
        default:
            return 'bg-secondary';
    }
}

// Helper function to capitalize first letter
function capitalizeFirstLetter(string) {
    if (!string) return '';
    return string.charAt(0).toUpperCase() + string.slice(1).replace('_', ' ');
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
            
            // Update the payment row in the table
            const paymentRow = document.querySelector(`.view-payment[data-id="${paymentId}"]`).closest('tr');
            if (paymentRow) {
                const statusCell = paymentRow.cells[3];
                statusCell.innerHTML = '<span class="badge bg-success">Approved</span>';
                
                // Update the action button to secondary (non-primary) color
                const actionCell = paymentRow.cells[4];
                actionCell.innerHTML = `
                    <button class="btn btn-sm btn-secondary view-payment" data-id="${paymentId}">
                        <i class="bi bi-eye"></i> View
                    </button>
                `;
                
                // Reattach the event listener
                actionCell.querySelector('.view-payment').addEventListener('click', () => viewPaymentDetails(paymentId));
            }
            
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
            
            // Hide the action buttons
            const approvePaymentBtn = document.getElementById('approvePaymentBtn');
            const rejectPaymentBtn = document.getElementById('rejectPaymentBtn');
            if (approvePaymentBtn && rejectPaymentBtn) {
                approvePaymentBtn.classList.add('d-none');
                rejectPaymentBtn.classList.add('d-none');
            }
            
            showAlert('success', 'Payment rejected successfully');
            
            // Update the payment row in the table
            const paymentRow = document.querySelector(`.view-payment[data-id="${paymentId}"]`).closest('tr');
            if (paymentRow) {
                const statusCell = paymentRow.cells[3];
                statusCell.innerHTML = '<span class="badge bg-danger">Rejected</span>';
                
                // Update the action button to secondary (non-primary) color
                const actionCell = paymentRow.cells[4];
                actionCell.innerHTML = `
                    <button class="btn btn-sm btn-secondary view-payment" data-id="${paymentId}">
                        <i class="bi bi-eye"></i> View
                    </button>
                `;
                
                // Reattach the event listener
                actionCell.querySelector('.view-payment').addEventListener('click', () => viewPaymentDetails(paymentId));
            }
            
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