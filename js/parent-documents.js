document.addEventListener('DOMContentLoaded', function() {
    // Load students for current parent
    loadStudents();
    
    // Set up document file inputs
    setupDocumentUploads();
    
    // Set up student selector
    document.getElementById('student-selector').addEventListener('change', function() {
        loadStudentDocuments(this.value);
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
        const documentsContainer = document.getElementById('documents-container');
        
        if (response.data.status === 'success') {
            const students = response.data.data;
            
            if (students.length === 0) {
                // Show no students message
                noStudentsMessage.classList.remove('d-none');
                documentsContainer.classList.add('d-none');
                document.getElementById('student-selector-container').classList.add('d-none');
                return;
            }
            
            // Hide no students message
            noStudentsMessage.classList.add('d-none');
            documentsContainer.classList.remove('d-none');
            
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
                    loadStudentDocuments(studentId);
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

// Load documents for a selected student
async function loadStudentDocuments(studentId) {
    try {
        if (!studentId) {
            return;
        }
        
        const response = await axios.get('../api/student.php', {
            params: {
                operation: 'getStudentById',
                id: studentId
            }
        });
        
        if (response.data.status === 'success') {
            const documents = response.data.data.documents;
            
            if (!documents) {
                showAlert('danger', 'No document record found for this student.');
                return;
            }
            
            // Update document statuses
            updateDocumentStatus('birth-certificate', documents.birth_certificate_status, documents.birth_certificate_file);
            updateDocumentStatus('id-picture', documents.id_picture_status, documents.id_picture_file);
            updateDocumentStatus('medical-certificate', documents.medical_certificate_status, documents.medical_certificate_file);
            updateDocumentStatus('report-card', documents.report_card_status, documents.report_card_file);
            
            // Update file inputs
            document.querySelectorAll('.document-file').forEach(input => {
                input.dataset.studentId = studentId;
            });
            
            showAlert('success', 'Document information loaded successfully.');
        } else {
            showAlert('danger', `Error loading documents: ${response.data.message}`);
        }
    } catch (error) {
        console.error('Error loading documents:', error);
        showAlert('danger', 'Error connecting to server. Please try again later.');
    }
}

// Update document status display
function updateDocumentStatus(docType, status, filename) {
    const statusBadge = document.getElementById(`${docType}-status`);
    const docFooter = document.getElementById(`${docType}-footer`);
    
    if (status == 1) {
        // Document verified
        statusBadge.classList.remove('bg-warning', 'bg-danger');
        statusBadge.classList.add('bg-success');
        statusBadge.textContent = 'Verified';
        
        // Update footer
        docFooter.innerHTML = `
            <small class="text-success">Verified and approved</small>
            ${filename ? `<br><a href="../uploads/documents/${filename}" target="_blank" class="btn btn-sm btn-outline-primary mt-1">View Document</a>` : ''}
        `;
    } else if (filename) {
        // Document uploaded but not verified
        statusBadge.classList.remove('bg-success', 'bg-danger');
        statusBadge.classList.add('bg-warning');
        statusBadge.textContent = 'Pending Verification';
        
        // Update footer
        docFooter.innerHTML = `
            <small class="text-warning">Uploaded, pending verification</small>
            <br><a href="../uploads/documents/${filename}" target="_blank" class="btn btn-sm btn-outline-primary mt-1">View Document</a>
        `;
    } else {
        // Document not uploaded
        statusBadge.classList.remove('bg-success', 'bg-primary');
        statusBadge.classList.add('bg-warning');
        statusBadge.textContent = 'Not Uploaded';
        
        // Update footer
        docFooter.innerHTML = `<small class="text-muted">Not yet uploaded</small>`;
    }
}

// Setup document upload handlers
function setupDocumentUploads() {
    document.querySelectorAll('.document-file').forEach(input => {
        input.addEventListener('change', handleDocumentUpload);
    });
}

// Handle document upload
async function handleDocumentUpload(event) {
    const file = event.target.files[0];
    const studentId = event.target.dataset.studentId;
    const documentType = event.target.dataset.type;
    
    // Check if student is selected
    if (!studentId) {
        showAlert('danger', 'Please select a student first before uploading documents.');
        return;
    }
    
    // Check if file is selected
    if (!file) {
        return;
    }
    
    // Check file size (2MB max)
    if (file.size > 2 * 1024 * 1024) {
        showAlert('danger', 'File size exceeds 2MB limit. Please select a smaller file.');
        return;
    }
    
    // Show upload progress modal
    const progressModal = new bootstrap.Modal(document.getElementById('uploadProgressModal'));
    progressModal.show();
    
    // Set initial progress
    const progressBar = document.querySelector('#uploadProgressModal .progress-bar');
    const statusText = document.getElementById('upload-status-text');
    progressBar.style.width = '0%';
    statusText.textContent = 'Preparing to upload...';
    
    try {
        // Create form data
        const formData = new FormData();
        formData.append('operation', 'uploadDocument');
        formData.append('student_id', studentId);
        formData.append('document_type', documentType);
        formData.append('document', file);
        
        // Upload file
        const response = await axios.post('../api/student.php', formData, {
            onUploadProgress: progressEvent => {
                const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                progressBar.style.width = `${percentCompleted}%`;
                statusText.textContent = `Uploading... ${percentCompleted}%`;
            }
        });
        
        if (response.data.status === 'success') {
            // Update progress bar to 100%
            progressBar.style.width = '100%';
            statusText.textContent = 'Upload completed successfully!';
            
            // Close modal after a short delay
            setTimeout(() => {
                progressModal.hide();
                
                // Refresh document status
                loadStudentDocuments(studentId);
                
                showAlert('success', 'Document uploaded successfully');
            }, 1000);
        } else {
            progressModal.hide();
            showAlert('danger', `Upload failed: ${response.data.message}`);
        }
    } catch (error) {
        console.error('Upload error:', error);
        progressModal.hide();
        showAlert('danger', 'Error connecting to server. Please try again later.');
    }
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