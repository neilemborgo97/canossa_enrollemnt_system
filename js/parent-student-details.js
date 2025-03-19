document.addEventListener('DOMContentLoaded', function() {
    // Get student ID from URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const studentId = urlParams.get('id');
    
    // If no student ID is provided, redirect to dashboard
    if (!studentId) {
        showError('No student ID provided. Redirecting to dashboard...');
        setTimeout(() => {
            window.location.href = 'dashboard.html';
        }, 2000);
        return;
    }
    
    // Load student details initially
    loadStudentDetails(studentId);
    
    // Set up a refresh interval to periodically check for status updates (every 30 seconds)
    const refreshInterval = setInterval(() => {
        loadStudentDetails(studentId, true);
    }, 30000); // 30 seconds
    
    // Clear interval when page is unloaded
    window.addEventListener('beforeunload', () => {
        clearInterval(refreshInterval);
    });
    
    // Add event listener for logout button
    document.getElementById('logoutBtn').addEventListener('click', function(e) {
        e.preventDefault();
        clearInterval(refreshInterval); // Clear interval on logout
        logout();
    });
});

// Function to load student details
async function loadStudentDetails(studentId, isRefresh = false) {
    try {
        const user = getCurrentUser();
        
        if (!user) {
            showError('Authentication required. Redirecting to login...');
            setTimeout(() => {
                window.location.href = '../login.html';
            }, 2000);
            return;
        }
        
        // Request student details from the API
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
        
        // Only log full debug info on initial load, not on refreshes to avoid console spam
        if (!isRefresh) {
            console.log("API Response:", response.data); // Debug log
            debugApiResponse(response.data); // Deeper debug analysis
        }
        
        if (response.data.status === 'success') {
            // Get the student data from the correct location in the response
            const responseData = response.data.data;
            let studentData = {};
            
            if (responseData.student) {
                // Standard response structure
                studentData = responseData.student;
                
                // Check if guardian info might be in a separate object
                if (responseData.guardian) {
                    studentData = { ...studentData, ...responseData.guardian };
                }
                
                // Check if emergency contact info is in the response
                if (responseData.emergency_contact) {
                    studentData = { ...studentData, ...responseData.emergency_contact };
                }
                
                // Check if the user (parent) info is in the response
                if (responseData.parent) {
                    // Use parent info for guardian if not available elsewhere
                    if (!studentData.guardian_name) {
                        studentData.guardian_name = responseData.parent.name;
                    }
                    if (!studentData.email) {
                        studentData.email = responseData.parent.email;
                    }
                    // Fix for contact number field name difference
                    if (!studentData.contact_number && responseData.parent.phone) {
                        studentData.contact_number = responseData.parent.phone;
                    }
                    if (!studentData.relationship) {
                        studentData.relationship = "Parent";
                    }
                }
            } else if (responseData) {
                // Alternative response structure
                studentData = responseData;
            } else {
                throw new Error('Invalid response structure');
            }
            
            if (!isRefresh) {
                console.log("Student data for display:", studentData); // Debug log
            }
            
            // Security check - verify if the student belongs to this parent
            if (studentData.parent_id && studentData.parent_id != user.id) {
                showError('You do not have permission to view this student. Redirecting to dashboard...');
                setTimeout(() => {
                    window.location.href = 'dashboard.html';
                }, 2000);
                return;
            }
            
            // Load emergency contact information separately if not available yet
            if (!studentData.emergency_contact_name || !studentData.emergency_contact_number || 
                !studentData.guardian_name || !studentData.relationship || !studentData.contact_number) {
                
                try {
                    const emergencyResponse = await axios.get('../api/student.php', {
                        params: {
                            operation: 'getEmergencyContact',
                            student_id: studentId
                        },
                        headers: {
                            'X-Auth-User': user.id.toString(),
                            'X-Auth-Role': user.role
                        }
                    });
                    
                    if (emergencyResponse.data.status === 'success' && emergencyResponse.data.data) {
                        // Merge emergency contact data with student data
                        studentData = { ...studentData, ...emergencyResponse.data.data };
                        if (!isRefresh) {
                            console.log("Emergency contact data loaded:", emergencyResponse.data.data);
                        }
                    }
                } catch (error) {
                    if (!isRefresh) {
                        console.error("Error fetching emergency contact data:", error);
                    }
                    // Continue with what we have
                }
            }
            
            // Use current user's data for guardian if still not available
            if (!studentData.guardian_name || !studentData.email || !studentData.contact_number) {
                const currentUser = getCurrentUser();
                if (currentUser) {
                    if (!studentData.guardian_name) {
                        studentData.guardian_name = currentUser.name || "Not provided";
                    }
                    if (!studentData.email) {
                        studentData.email = currentUser.email || "Not provided";
                    }
                    if (!studentData.relationship) {
                        studentData.relationship = "Parent";
                    }
                }
            }
            
            displayStudentDetails(studentData);
            
            // Only set up action links and show/hide elements on initial load
            if (!isRefresh) {
                setupActionLinks(studentId);
                
                // Hide loading indicator and show student details
                document.getElementById('loading-indicator').classList.add('d-none');
                document.getElementById('student-details-container').classList.remove('d-none');
            }
        } else {
            if (!isRefresh) {
                showError(`Error loading student details: ${response.data.message}`);
            } else {
                console.error(`Error refreshing student details: ${response.data.message}`);
            }
        }
    } catch (error) {
        if (!isRefresh) {
            console.error('Error loading student details:', error);
            showError('Failed to load student details. Please try again later.');
        } else {
            console.error('Error refreshing student details:', error);
        }
    }
}

// Function to display student details in the UI
function displayStudentDetails(student) {
    // Set student name in header
    document.getElementById('student-name').textContent = student.name || 'Student';
    
    // Basic student information
    document.getElementById('detail-name').textContent = student.name || 'Not provided';
    document.getElementById('detail-age').textContent = student.age || 'Not provided';
    document.getElementById('detail-gender').textContent = capitalizeFirstLetter(student.gender) || 'Not provided';
    document.getElementById('detail-birthdate').textContent = formatDate(student.birthdate) || 'Not provided';
    document.getElementById('detail-level').textContent = student.level_name || 'Not assigned';
    document.getElementById('detail-schedule').textContent = getScheduleText(student.schedule) || 'Not set';
    document.getElementById('detail-previous-school').textContent = student.previous_school || 'None';
    document.getElementById('detail-address').textContent = student.address || 'Not provided';
    
    // Enrollment status
    const statusBadge = document.getElementById('detail-status-badge');
    const statusClass = getStatusClass(student.enrollment_status);
    statusBadge.innerHTML = `<span class="badge ${statusClass} status-badge text-capitalize">${student.enrollment_status || 'Unknown'}</span>`;
    
    document.getElementById('detail-enrollment-date').textContent = formatDate(student.created_at) || 'Not available';
    
    // Admin comments (especially important for rejections)
    const adminComments = document.getElementById('detail-admin-comments');
    if (student.admin_comments) {
        adminComments.textContent = student.admin_comments;
        // If status is rejected, highlight the comments
        if (student.enrollment_status === 'rejected') {
            adminComments.classList.add('text-danger', 'fw-bold');
        } else {
            adminComments.classList.remove('text-danger', 'fw-bold');
        }
    } else {
        adminComments.textContent = 'None';
        adminComments.classList.remove('text-danger', 'fw-bold');
    }
    
    // Guardian information
    document.getElementById('detail-guardian-name').textContent = student.guardian_name || 'Not provided';
    document.getElementById('detail-relationship').textContent = student.relationship || 'Not provided';
    document.getElementById('detail-contact-number').textContent = student.contact_number || 'Not provided';
    document.getElementById('detail-email').textContent = student.email || 'Not provided';
    
    // Emergency contact
    document.getElementById('detail-emergency-name').textContent = student.emergency_contact_name || 'Not provided';
    document.getElementById('detail-emergency-number').textContent = student.emergency_contact_number || 'Not provided';
}

// Setup links for quick actions
function setupActionLinks(studentId) {
    document.getElementById('documents-link').href = `documents.html?student_id=${studentId}`;
    document.getElementById('payments-link').href = `payments.html?student_id=${studentId}`;
    document.getElementById('schedule-link').href = `#`; // Not implemented yet
    
    // Add event listener for schedule link (not implemented yet)
    document.getElementById('schedule-link').addEventListener('click', function(e) {
        e.preventDefault();
        alert('Class schedule feature will be available soon!');
    });
}

// Helper function to show error messages
function showError(message) {
    const errorContainer = document.getElementById('error-message');
    const errorText = document.getElementById('error-text');
    
    errorText.textContent = message;
    errorContainer.classList.remove('d-none');
    document.getElementById('loading-indicator').classList.add('d-none');
}

// Helper function to capitalize first letter
function capitalizeFirstLetter(string) {
    if (!string) return '';
    return string.charAt(0).toUpperCase() + string.slice(1);
}

// Helper function to format date
function formatDate(dateString) {
    if (!dateString) return 'N/A';
    
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) {
            return 'Invalid date';
        }
        return date.toLocaleDateString();
    } catch (error) {
        console.error('Error formatting date:', error);
        return 'Date error';
    }
}

// Helper function to get schedule text
function getScheduleText(schedule) {
    if (!schedule) return 'Not set';
    
    switch(schedule.toLowerCase()) {
        case 'morning':
            return 'Morning (8:00 AM - 11:00 AM)';
        case 'afternoon':
            return 'Afternoon (1:00 PM - 4:00 PM)';
        default:
            return capitalizeFirstLetter(schedule);
    }
}

// Helper function to get status class
function getStatusClass(status) {
    if (!status) return 'bg-secondary';
    
    switch (status.toLowerCase()) {
        case 'enrolled':
            return 'bg-success';
        case 'pending':
            return 'bg-warning';
        case 'rejected':
            return 'bg-danger';
        default:
            return 'bg-secondary';
    }
}

// Debug function to log API response structure
function debugApiResponse(data) {
    console.log("API Response Structure:");
    console.log("Status:", data.status);
    console.log("Message:", data.message);
    console.log("Data Structure:", typeof data.data);
    
    if (data.data) {
        console.log("Data contains student?", 'student' in data.data);
        
        if (data.data.student) {
            console.log("Student properties:", Object.keys(data.data.student));
        } else {
            console.log("Data properties:", Object.keys(data.data));
        }
    }
    
    // Try to identify where the guardian info might be
    const searchPath = function(obj, path = '') {
        if (!obj || typeof obj !== 'object') return;
        
        for (const key in obj) {
            if (['guardian_name', 'relationship', 'contact_number', 'email'].includes(key)) {
                console.log(`Found guardian info at: ${path}.${key} = ${obj[key]}`);
            }
            
            if (typeof obj[key] === 'object' && obj[key] !== null) {
                searchPath(obj[key], path ? `${path}.${key}` : key);
            }
        }
    };
    
    searchPath(data);
} 