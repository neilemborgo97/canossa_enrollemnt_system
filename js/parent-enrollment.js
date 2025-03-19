document.addEventListener('DOMContentLoaded', function() {
    console.log('DOMContentLoaded event fired');
    
    // Load grade levels
    console.log('About to call loadLevels()');
    loadLevels();
    
    // Setup form submission
    setupEnrollmentForm();
    
    // Auto-calculate age on birthdate change
    setupBirthdateAgeDependency();
    
    // Handle cancel button
    document.getElementById('cancelBtn').addEventListener('click', function() {
        window.location.href = 'dashboard.html';
    });
});

// Load kindergarten levels for dropdown
async function loadLevels() {
    try {
        console.log('Inside loadLevels() function, making API call...');
        
        // Use direct GET parameters instead of params object to ensure compatibility
        const apiUrl = '../api/student.php?operation=getLevels';
        console.log('API URL:', apiUrl);
        
        const response = await axios.get(apiUrl);
        console.log('Raw API response:', response);
        console.log('API response data:', response.data);
        
        const levelSelect = document.getElementById('level');
        console.log('Level select element:', levelSelect);
        
        if (response.data && response.data.status === 'success' && response.data.data) {
            const levels = response.data.data;
            console.log('Levels found:', levels.length);
            console.log('Full levels data:', levels);
            
            let options = '<option value="" selected disabled>Select level</option>';
            
            levels.forEach(level => {
                console.log('Processing level:', level);
                options += `<option value="${level.id}">${level.level_name}</option>`;
                console.log(`Added level: ${level.id} - ${level.level_name}`);
            });
            
            console.log('Final options HTML:', options);
            levelSelect.innerHTML = options;
            console.log('Dropdown populated successfully');
        } else {
            console.error('Error in API response:', response.data);
            
            // Check specific error conditions
            if (!response.data) {
                console.error('Response data is null or undefined');
            } else if (response.data.status !== 'success') {
                console.error('Status is not success:', response.data.status);
            } else if (!response.data.data) {
                console.error('Data property is missing or empty');
            }
            
            // Try using the direct test endpoint as fallback
            console.log('Trying fallback direct test endpoint...');
            await loadLevelsFallback();
        }
    } catch (error) {
        console.error('Error object:', error);
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
        console.error('Error response:', error.response ? error.response.data : 'No response data');
        
        // Try using the direct test endpoint as fallback
        console.log('Trying fallback direct test endpoint after error...');
        await loadLevelsFallback();
    }
}

// Fallback method to load levels from direct test endpoint
async function loadLevelsFallback() {
    try {
        console.log('Inside loadLevelsFallback() function');
        
        const directApiUrl = '../api/direct_levels_test.php';
        console.log('Direct API URL:', directApiUrl);
        
        const response = await axios.get(directApiUrl);
        console.log('Direct API response:', response.data);
        
        const levelSelect = document.getElementById('level');
        
        if (response.data && response.data.status === 'success' && response.data.data) {
            const levels = response.data.data;
            console.log('Fallback levels found:', levels.length);
            
            let options = '<option value="" selected disabled>Select level</option>';
            
            levels.forEach(level => {
                options += `<option value="${level.id}">${level.level_name}</option>`;
                console.log(`Fallback added level: ${level.id} - ${level.level_name}`);
            });
            
            levelSelect.innerHTML = options;
            console.log('Dropdown populated successfully using fallback');
        } else {
            console.error('Error in fallback API response:', response.data);
            levelSelect.innerHTML = '<option value="" selected disabled>Error loading levels</option>';
            
            // Show an alert to the user
            showAlert('danger', 'Error loading grade levels. Please refresh the page or contact support.');
        }
    } catch (error) {
        console.error('Error in fallback:', error);
        
        // Show an alert to the user
        const levelSelect = document.getElementById('level');
        levelSelect.innerHTML = '<option value="" selected disabled>Error loading levels</option>';
        
        showAlert('danger', `Error connecting to server: ${error.message}. Please check your internet connection and try again.`);
    }
}

// Setup enrollment form submission
function setupEnrollmentForm() {
    const form = document.getElementById('enrollmentForm');
    
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        try {
            const user = getCurrentUser();
            
            if (!user) {
                showAlert('danger', 'User session expired. Please log in again.');
                return;
            }
            
            // Collect form data
            const enrollmentData = {
                parent_id: user.id,
                name: document.getElementById('childName').value,
                birthdate: document.getElementById('birthdate').value,
                age: document.getElementById('age').value,
                gender: document.getElementById('gender').value,
                address: document.getElementById('address').value,
                previous_school: document.getElementById('previousSchool').value || null,
                level_id: document.getElementById('level').value,
                schedule: document.getElementById('schedule').value,
                guardian_name: document.getElementById('guardianName').value,
                relationship: document.getElementById('relationship').value,
                contact_number: document.getElementById('contactNumber').value,
                email: document.getElementById('email').value,
                emergency_contact_name: document.getElementById('emergencyName').value,
                emergency_contact_number: document.getElementById('emergencyNumber').value
            };
            
            // Submit form data
            const formData = new FormData();
            formData.append('operation', 'addStudent');
            formData.append('json', JSON.stringify(enrollmentData));
            
            const response = await axios.post('../api/student.php', formData);
            
            if (response.data.status === 'success') {
                // Show success modal
                const successModal = new bootstrap.Modal(document.getElementById('successModal'));
                successModal.show();
                
                // Reset form
                form.reset();
            } else {
                showAlert('danger', `Enrollment failed: ${response.data.message}`);
            }
        } catch (error) {
            console.error('Enrollment error:', error);
            showAlert('danger', 'Error connecting to server. Please try again later.');
        }
    });
}

// Auto-calculate age when birthdate changes
function setupBirthdateAgeDependency() {
    const birthdateInput = document.getElementById('birthdate');
    const ageInput = document.getElementById('age');
    
    birthdateInput.addEventListener('change', function() {
        if (this.value) {
            const birthdate = new Date(this.value);
            const today = new Date();
            
            let age = today.getFullYear() - birthdate.getFullYear();
            
            // Adjust age if birthday hasn't occurred yet this year
            const m = today.getMonth() - birthdate.getMonth();
            if (m < 0 || (m === 0 && today.getDate() < birthdate.getDate())) {
                age--;
            }
            
            ageInput.value = age;
        }
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