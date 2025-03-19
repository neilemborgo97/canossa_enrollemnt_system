document.addEventListener('DOMContentLoaded', () => {
    // Initialize variables
    let currentDocuments = [];
    let currentPage = 1;
    const itemsPerPage = 10;
    let selectedDocumentId = null;
    let selectedStudentId = null;
    let selectedDocumentType = null;
    
    // Get elements
    const documentsTableBody = document.getElementById('documents-list');
    const paginationContainer = document.getElementById('pagination');
    const documentTypeFilter = document.getElementById('document-type-filter');
    const statusFilter = document.getElementById('status-filter');
    const levelFilter = document.getElementById('level-filter');
    const searchFilter = document.getElementById('search-filter');
    const totalDocumentsEl = document.getElementById('total-documents');
    const uploadedCountEl = document.getElementById('uploaded-count');
    const missingCountEl = document.getElementById('missing-count');
    
    // Document viewer modal elements
    const documentViewerModal = new bootstrap.Modal(document.getElementById('documentViewerModal'));
    const documentImage = document.getElementById('fullDocumentImage');
    const documentStudentName = document.getElementById('document-student-name');
    const documentLoadError = document.getElementById('documentLoadError');
    const documentDownloadLink = document.getElementById('documentDownloadLink');
    
    // Initialize page
    loadGradeLevels();
    loadDocuments();
    
    // Set up event listeners
    documentTypeFilter.addEventListener('change', applyFilters);
    statusFilter.addEventListener('change', applyFilters);
    levelFilter.addEventListener('change', applyFilters);
    searchFilter.addEventListener('input', applyFilters);
    
    document.getElementById('exportBtn').addEventListener('click', exportDocumentsList);
    document.getElementById('printBtn').addEventListener('click', printDocumentsList);
    
    document.getElementById('logoutBtn').addEventListener('click', logout);
    
    /**
     * Fetch and load all documents
     */
    function loadDocuments() {
        // Show loading state
        documentsTableBody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center">
                    <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden">Loading...</span>
                    </div>
                    <p class="mt-2">Loading documents...</p>
                </td>
            </tr>
        `;
        
        // Get current user
        const user = getCurrentUser();
        if (!user) {
            window.location.href = '../login.html';
            return;
        }
        
        // Fetch documents from API
        axios.get('../api/student.php', {
            params: {
                operation: 'getAllDocuments'
            },
            headers: {
                'X-Auth-User': user.id.toString(),
                'X-Auth-Role': user.role
            }
        })
        .then(response => {
            if (response.data.status === 'success') {
                // Transform the data to our expected format
                const docs = response.data.data.map(doc => {
                    // Create a normalized document object for each document type
                    return [
                        {
                            id: doc.id,
                            student_id: doc.student_id,
                            student_name: doc.name,
                            document_type: 'birth_certificate',
                            file_path: doc.birth_certificate_file,
                            is_uploaded: doc.birth_certificate_status,
                            upload_date: doc.updated_at,
                            grade_level: doc.level_name
                        },
                        {
                            id: doc.id,
                            student_id: doc.student_id,
                            student_name: doc.name,
                            document_type: 'id_picture',
                            file_path: doc.id_picture_file,
                            is_uploaded: doc.id_picture_status,
                            upload_date: doc.updated_at,
                            grade_level: doc.level_name
                        },
                        {
                            id: doc.id,
                            student_id: doc.student_id,
                            student_name: doc.name,
                            document_type: 'medical_certificate',
                            file_path: doc.medical_certificate_file,
                            is_uploaded: doc.medical_certificate_status,
                            upload_date: doc.updated_at,
                            grade_level: doc.level_name
                        },
                        {
                            id: doc.id,
                            student_id: doc.student_id,
                            student_name: doc.name,
                            document_type: 'report_card',
                            file_path: doc.report_card_file,
                            is_uploaded: doc.report_card_status,
                            upload_date: doc.updated_at,
                            grade_level: doc.level_name
                        }
                    ];
                });
                
                // Flatten the array of arrays
                currentDocuments = docs.flat();
                updateDocumentCounters(currentDocuments);
                applyFilters();
            } else {
                showError('Failed to load documents: ' + response.data.message);
            }
        })
        .catch(error => {
            console.error('Error loading documents:', error);
            showError('Error loading documents. Please try again later.');
        });
    }
    
    /**
     * Apply filters to documents and refresh the table
     */
    function applyFilters() {
        const documentType = documentTypeFilter.value;
        const status = statusFilter.value;
        const level = levelFilter.value;
        const searchTerm = searchFilter.value.toLowerCase();
        
        // Filter documents
        let filteredDocuments = currentDocuments.filter(doc => {
            // Document type filter
            if (documentType !== 'all' && doc.document_type !== documentType) {
                return false;
            }
            
            // Status filter
            if (status !== 'all') {
                const docStatus = doc.is_uploaded == 1 ? '1' : '0';
                if (docStatus !== status) {
                    return false;
                }
            }
            
            // Level filter
            if (level !== 'all' && doc.grade_level !== level) {
                return false;
            }
            
            // Search filter (student name, ID, etc.)
            if (searchTerm && !doc.student_name.toLowerCase().includes(searchTerm) && 
                !doc.student_id.toString().includes(searchTerm)) {
                return false;
            }
            
            return true;
        });
        
        renderDocumentsTable(filteredDocuments);
        renderPagination(filteredDocuments.length);
    }
    
    /**
     * Render the documents table with the filtered data
     */
    function renderDocumentsTable(documents) {
        if (documents.length === 0) {
            documentsTableBody.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center">
                        <p class="my-3">No documents found matching your filters.</p>
                    </td>
                </tr>
            `;
            return;
        }
        
        // Calculate pagination
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = Math.min(startIndex + itemsPerPage, documents.length);
        const paginatedDocuments = documents.slice(startIndex, endIndex);
        
        // Create table rows
        let tableHtml = '';
        paginatedDocuments.forEach(doc => {
            const statusClass = doc.is_uploaded == 1 ? 'success' : 'danger';
            const statusText = doc.is_uploaded == 1 ? 'Uploaded' : 'Not Uploaded';
            const imagePreview = doc.is_uploaded == 1 && doc.file_path ? 
                `<img src="../uploads/documents/${doc.file_path}" class="document-thumbnail" data-document-id="${doc.id}" data-student-id="${doc.student_id}" data-document-type="${doc.document_type}" data-student-name="${doc.student_name}" data-file-path="${doc.file_path}" alt="Document preview">` : 
                '<span class="text-muted">No file</span>';
            
            const uploadDate = doc.is_uploaded == 1 && doc.upload_date ? 
                new Date(doc.upload_date).toLocaleDateString() : '-';
            
            const documentTypeDisplay = formatDocumentType(doc.document_type);
            
            tableHtml += `
                <tr>
                    <td>${doc.student_id}</td>
                    <td>${doc.student_name}</td>
                    <td>${documentTypeDisplay}</td>
                    <td>${imagePreview}</td>
                    <td>${uploadDate}</td>
                    <td><span class="badge bg-${statusClass} status-badge">${statusText}</span></td>
                    <td>
                        ${doc.is_uploaded == 1 ? `
                            <button class="btn btn-sm btn-primary view-document-btn" data-document-id="${doc.id}" data-student-id="${doc.student_id}" data-document-type="${doc.document_type}" data-student-name="${doc.student_name}" data-file-path="${doc.file_path}">
                                <i class="bi bi-eye"></i> View
                            </button>
                        ` : ''}
                    </td>
                </tr>
            `;
        });
        
        documentsTableBody.innerHTML = tableHtml;
        
        // Add event listeners for document thumbnails and view buttons
        document.querySelectorAll('.document-thumbnail, .view-document-btn').forEach(element => {
            element.addEventListener('click', (e) => {
                const target = e.currentTarget;
                openDocumentViewer(
                    target.dataset.documentId,
                    target.dataset.studentId,
                    target.dataset.documentType,
                    target.dataset.studentName,
                    target.dataset.filePath
                );
            });
        });
    }
    
    /**
     * Render pagination controls
     */
    function renderPagination(totalItems) {
        const totalPages = Math.ceil(totalItems / itemsPerPage);
        
        if (totalPages <= 1) {
            paginationContainer.innerHTML = '';
            return;
        }
        
        let paginationHtml = `
            <li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
                <a class="page-link" href="#" data-page="prev" aria-label="Previous">
                    <span aria-hidden="true">&laquo;</span>
                </a>
            </li>
        `;
        
        // Calculate visible page numbers (max 5)
        let startPage = Math.max(1, currentPage - 2);
        let endPage = Math.min(totalPages, startPage + 4);
        
        if (endPage - startPage < 4) {
            startPage = Math.max(1, endPage - 4);
        }
        
        for (let i = startPage; i <= endPage; i++) {
            paginationHtml += `
                <li class="page-item ${currentPage === i ? 'active' : ''}">
                    <a class="page-link" href="#" data-page="${i}">${i}</a>
                </li>
            `;
        }
        
        paginationHtml += `
            <li class="page-item ${currentPage === totalPages ? 'disabled' : ''}">
                <a class="page-link" href="#" data-page="next" aria-label="Next">
                    <span aria-hidden="true">&raquo;</span>
                </a>
            </li>
        `;
        
        paginationContainer.innerHTML = paginationHtml;
        
        // Add event listeners for pagination
        document.querySelectorAll('.page-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const page = e.target.dataset.page || e.target.parentElement.dataset.page;
                
                if (page === 'prev') {
                    if (currentPage > 1) {
                        currentPage--;
                        applyFilters();
                    }
                } else if (page === 'next') {
                    if (currentPage < totalPages) {
                        currentPage++;
                        applyFilters();
                    }
                } else {
                    currentPage = parseInt(page);
                    applyFilters();
                }
            });
        });
    }
    
    /**
     * Load grade levels for filter
     */
    function loadGradeLevels() {
        axios.get('../api/student.php', {
            params: {
                operation: 'getGradeLevels'
            }
        })
        .then(response => {
            if (response.data.status === 'success') {
                const levels = response.data.data;
                const levelSelect = document.getElementById('level-filter');
                
                levels.forEach(level => {
                    const option = document.createElement('option');
                    option.value = level.level_name;
                    option.textContent = level.level_name;
                    levelSelect.appendChild(option);
                });
            }
        })
        .catch(error => {
            console.error('Error loading grade levels:', error);
        });
    }
    
    /**
     * Open document viewer modal
     */
    function openDocumentViewer(documentId, studentId, documentType, studentName, filePath) {
        selectedDocumentId = documentId;
        selectedStudentId = studentId;
        selectedDocumentType = documentType;
        
        // Update modal content
        documentStudentName.textContent = studentName;
        documentLoadError.classList.add('d-none');
        
        // Set download link
        documentDownloadLink.href = `../uploads/documents/${filePath}`;
        
        // Set image source (with error handling)
        documentImage.src = '';
        documentImage.classList.add('d-none');
        
        // Add title to modal
        document.getElementById('documentModalTitle').textContent = 'View ' + formatDocumentType(documentType);
        
        // Load the document image
        const img = new Image();
        img.onload = function() {
            documentImage.src = `../uploads/documents/${filePath}`;
            documentImage.classList.remove('d-none');
        };
        img.onerror = function() {
            documentLoadError.classList.remove('d-none');
        };
        img.src = `../uploads/documents/${filePath}`;
        
        // Show modal
        documentViewerModal.show();
    }
    
    /**
     * Update document counter displays
     */
    function updateDocumentCounters(documents) {
        const total = documents.length;
        const uploaded = documents.filter(doc => doc.is_uploaded == 1).length;
        const missing = total - uploaded;
        
        totalDocumentsEl.textContent = total;
        uploadedCountEl.textContent = uploaded;
        missingCountEl.textContent = missing;
    }
    
    /**
     * Helper function to map document type string to database field
     */
    function documentTypeToFieldName(documentType) {
        switch (documentType) {
            case 'birth_certificate':
                return 'birth_certificate';
            case 'id_picture':
                return 'id_picture';
            case 'medical_certificate':
                return 'medical_certificate';
            case 'report_card':
                return 'report_card';
            default:
                return documentType;
        }
    }
    
    /**
     * Export documents list to CSV
     */
    function exportDocumentsList() {
        // Apply current filters
        const documentType = documentTypeFilter.value;
        const status = statusFilter.value;
        const level = levelFilter.value;
        const searchTerm = searchFilter.value.toLowerCase();
        
        // Filter documents
        let filteredDocuments = currentDocuments.filter(doc => {
            // Document type filter
            if (documentType !== 'all' && doc.document_type !== documentType) {
                return false;
            }
            
            // Status filter
            if (status !== 'all') {
                const docStatus = doc.is_uploaded == 1 ? '1' : '0';
                if (docStatus !== status) {
                    return false;
                }
            }
            
            // Level filter
            if (level !== 'all' && doc.grade_level !== level) {
                return false;
            }
            
            // Search filter
            if (searchTerm && !doc.student_name.toLowerCase().includes(searchTerm) && 
                !doc.student_id.toString().includes(searchTerm)) {
                return false;
            }
            
            return true;
        });
        
        // Create CSV content
        let csvContent = 'Student ID,Student Name,Document Type,Upload Date,Status\n';
        
        filteredDocuments.forEach(doc => {
            const documentTypeDisplay = formatDocumentType(doc.document_type);
            const uploadDate = doc.is_uploaded == 1 && doc.upload_date ? 
                new Date(doc.upload_date).toLocaleDateString() : 'N/A';
            const status = doc.is_uploaded == 1 ? 'Uploaded' : 'Not Uploaded';
            
            csvContent += `${doc.student_id},"${doc.student_name}","${documentTypeDisplay}","${uploadDate}","${status}"\n`;
        });
        
        // Create download link
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', 'documents.csv');
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        showAlert('Documents exported successfully', 'success');
    }
    
    /**
     * Print documents list
     */
    function printDocumentsList() {
        window.print();
    }
    
    /**
     * Format document type for display
     */
    function formatDocumentType(type) {
        return type
            .replace(/_/g, ' ')
            .split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    }
    
    /**
     * Show error message in table
     */
    function showError(message) {
        documentsTableBody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center text-danger">
                    <i class="bi bi-exclamation-triangle me-2"></i>
                    ${message}
                </td>
            </tr>
        `;
    }
    
    /**
     * Show alert message
     */
    function showAlert(message, type = 'info') {
        const alertElement = document.createElement('div');
        alertElement.className = `alert alert-${type} alert-dismissible fade show`;
        alertElement.setAttribute('role', 'alert');
        alertElement.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        `;
        
        const mainContent = document.querySelector('main');
        mainContent.insertBefore(alertElement, mainContent.firstChild);
        
        // Auto dismiss after 5 seconds
        setTimeout(() => {
            alertElement.classList.remove('show');
            setTimeout(() => {
                if (alertElement.parentNode) {
                    alertElement.parentNode.removeChild(alertElement);
                }
            }, 150);
        }, 5000);
    }
    
    /**
     * Helper function to get the current user
     */
    function getCurrentUser() {
        const userString = localStorage.getItem('user');
        if (!userString) {
            return null;
        }
        
        try {
            return JSON.parse(userString);
        } catch (e) {
            console.error('Error parsing user from localStorage:', e);
            return null;
        }
    }
    
    /**
     * Log out
     */
    function logout() {
        localStorage.removeItem('user');
        window.location.href = '../login.html';
    }
}); 