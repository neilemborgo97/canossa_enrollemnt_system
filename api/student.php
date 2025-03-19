<?php
header('Content-Type: application/json');
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

// Include connection files    // mysqli connection
include_once "connection-pdo.php"; // PDO connection

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    exit(0);
}

class Student {
    // Add new student
    function addStudent($json) {
        include "connection-pdo.php";
        $data = json_decode($json);
        
        try {
            $pdo->beginTransaction();
            
            // Insert student
            $stmt = $pdo->prepare("INSERT INTO tbl_students (parent_id, name, birthdate, age, gender, address, 
                previous_school, level_id, schedule, enrollment_status) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')");
            
            $stmt->execute([
                $data->parent_id,
                $data->name,
                $data->birthdate,
                $data->age,
                $data->gender,
                $data->address,
                $data->previous_school ?? null,
                $data->level_id,
                $data->schedule
            ]);
            
            $student_id = $pdo->lastInsertId();
            
            // Create emergency contact
            $stmt = $pdo->prepare("INSERT INTO tbl_emergency_contacts (student_id, guardian_name, relationship,
                contact_number, email, emergency_contact_name, emergency_contact_number)
                VALUES (?, ?, ?, ?, ?, ?, ?)");
                
            $stmt->execute([
                $student_id,
                $data->guardian_name,
                $data->relationship,
                $data->contact_number,
                $data->email,
                $data->emergency_contact_name,
                $data->emergency_contact_number
            ]);
            
            // Create required documents entry
            $stmt = $pdo->prepare("INSERT INTO tbl_required_documents (student_id) VALUES (?)");
            $stmt->execute([$student_id]);
            
            // Create enrollment
            $stmt = $pdo->prepare("INSERT INTO tbl_enrollments (student_id, enrollment_date) 
                VALUES (?, CURDATE())");
            $stmt->execute([$student_id]);
            
            $pdo->commit();
            
            return json_encode([
                'status' => 'success',
                'message' => 'Student added successfully',
                'student_id' => $student_id
            ]);
        } catch(PDOException $e) {
            $pdo->rollBack();
            return json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
    }
    
    // Get students by parent ID
    function getStudentsByParent($parent_id) {
        include "connection-pdo.php";
        
        try {
            $stmt = $pdo->prepare("SELECT s.*, k.level_name, sec.section_name
                FROM tbl_students s
                LEFT JOIN tbl_kindergarten_levels k ON s.level_id = k.id
                LEFT JOIN tbl_sections sec ON s.section_id = sec.id
                WHERE s.parent_id = ?
                ORDER BY s.created_at DESC");
            $stmt->execute([$parent_id]);
            
            $students = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            return json_encode(['status' => 'success', 'data' => $students]);
        } catch(PDOException $e) {
            return json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
    }
    
    // Get all students (admin)
    function getAllStudents() {
        include "connection-pdo.php";
        
        try {
            $stmt = $pdo->prepare("SELECT s.*, u.name as parent_name, k.level_name, sec.section_name
                FROM tbl_students s
                LEFT JOIN tbl_users u ON s.parent_id = u.id
                LEFT JOIN tbl_kindergarten_levels k ON s.level_id = k.id
                LEFT JOIN tbl_sections sec ON s.section_id = sec.id
                ORDER BY s.created_at DESC");
            $stmt->execute();
            
            $students = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            return json_encode(['status' => 'success', 'data' => $students]);
        } catch(PDOException $e) {
            return json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
    }
    
    // Get student details by ID
    function getStudentById($id) {
        include "connection-pdo.php";
        
        try {
            // Get student data
            $stmt = $pdo->prepare("SELECT s.*, k.level_name, sec.section_name, u.name as parent_name, u.email as parent_email
                FROM tbl_students s
                LEFT JOIN tbl_kindergarten_levels k ON s.level_id = k.id
                LEFT JOIN tbl_sections sec ON s.section_id = sec.id
                LEFT JOIN tbl_users u ON s.parent_id = u.id
                WHERE s.id = ?");
            $stmt->execute([$id]);
            $student = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$student) {
                return json_encode(['status' => 'error', 'message' => 'Student not found']);
            }
            
            // Get emergency contact
            $stmt = $pdo->prepare("SELECT * FROM tbl_emergency_contacts WHERE student_id = ?");
            $stmt->execute([$id]);
            $emergency = $stmt->fetch(PDO::FETCH_ASSOC);
            
            // Get enrollment data
            $stmt = $pdo->prepare("SELECT e.*, p.name as payment_type_name, p.amount as payment_type_amount 
                FROM tbl_enrollments e
                LEFT JOIN tbl_payment_types p ON e.payment_type_id = p.id
                WHERE e.student_id = ?
                ORDER BY e.created_at DESC LIMIT 1");
            $stmt->execute([$id]);
            $enrollment = $stmt->fetch(PDO::FETCH_ASSOC);
            
            // Get documents
            $stmt = $pdo->prepare("SELECT * FROM tbl_required_documents WHERE student_id = ?");
            $stmt->execute([$id]);
            $documents = $stmt->fetch(PDO::FETCH_ASSOC);
            
            // Get parent info
            $stmt = $pdo->prepare("SELECT u.* FROM tbl_users u WHERE u.id = ?");
            $stmt->execute([$student['parent_id']]);
            $parent = $stmt->fetch(PDO::FETCH_ASSOC);
            
            // Merge emergency contact data with student data to make it easier to display
            $studentWithContactInfo = $student;
            if ($emergency) {
                // Add emergency contact info directly to student data for easy access
                $studentWithContactInfo['guardian_name'] = $emergency['guardian_name'];
                $studentWithContactInfo['relationship'] = $emergency['relationship'];
                $studentWithContactInfo['contact_number'] = $emergency['contact_number'];
                $studentWithContactInfo['emergency_contact_name'] = $emergency['emergency_contact_name'];
                $studentWithContactInfo['emergency_contact_number'] = $emergency['emergency_contact_number'];
                // Don't override email if it's already in student data
                if (!isset($studentWithContactInfo['email']) && isset($emergency['email'])) {
                    $studentWithContactInfo['email'] = $emergency['email'];
                }
            } else if ($parent) {
                // Use parent data as fallback
                $studentWithContactInfo['guardian_name'] = $parent['name'];
                $studentWithContactInfo['relationship'] = 'Parent';
                $studentWithContactInfo['contact_number'] = $parent['phone'] ?? 'Not provided';
                $studentWithContactInfo['email'] = $parent['email'];
                $studentWithContactInfo['emergency_contact_name'] = 'Same as Parent';
                $studentWithContactInfo['emergency_contact_number'] = $parent['phone'] ?? 'Not provided';
            }
            
            return json_encode([
                'status' => 'success', 
                'data' => [
                    'student' => $studentWithContactInfo,
                    'emergency_contact' => $emergency,
                    'enrollment' => $enrollment,
                    'documents' => $documents,
                    'parent' => $parent
                ]
            ]);
        } catch(PDOException $e) {
            return json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
    }
    
    // Update student enrollment status (admin)
    function updateEnrollmentStatus($json) {
        include "connection-pdo.php";
        $data = json_decode($json);
        
        try {
            $pdo->beginTransaction();
            
            // Update student enrollment status
            $stmt = $pdo->prepare("UPDATE tbl_students SET enrollment_status = ?, section_id = ?, admin_comments = ? WHERE id = ?");
            
            // Set admin comments if provided (e.g., rejection reason)
            $adminComments = isset($data->reason) ? $data->reason : null;
            
            $stmt->execute([
                $data->status,
                $data->section_id ?? null,
                $adminComments,
                $data->student_id
            ]);
            
            // Update enrollment record with approval details and timestamp
            $stmt = $pdo->prepare("UPDATE tbl_enrollments SET 
                approved_by = ?, 
                status_update_date = NOW(),
                status = ?
                WHERE student_id = ?");
                
            $stmt->execute([
                $data->admin_id,
                $data->status,
                $data->student_id
            ]);
            
            $pdo->commit();
            
            return json_encode([
                'status' => 'success',
                'message' => 'Student enrollment status updated successfully'
            ]);
        } catch(PDOException $e) {
            $pdo->rollBack();
            return json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
    }
    
    // Upload required document
    function uploadDocument($student_id, $document_type, $file) {
        include "connection-pdo.php";
        
        $allowed_types = ['birth_certificate', 'id_picture', 'medical_certificate', 'report_card'];
        if (!in_array($document_type, $allowed_types)) {
            return json_encode(['status' => 'error', 'message' => 'Invalid document type']);
        }
        
        $upload_dir = "../uploads/documents/";
        if (!file_exists($upload_dir)) {
            mkdir($upload_dir, 0777, true);
        }
        
        // Generate unique filename
        $filename = $student_id . '_' . $document_type . '_' . time() . '.' . pathinfo($file['name'], PATHINFO_EXTENSION);
        $target_file = $upload_dir . $filename;
        
        try {
            if (move_uploaded_file($file['tmp_name'], $target_file)) {
                // Update document record
                $column = $document_type . '_file';
                $status_column = $document_type . '_status';
                
                $stmt = $pdo->prepare("UPDATE tbl_required_documents SET $column = ?, $status_column = 1 WHERE student_id = ?");
                $stmt->execute([$filename, $student_id]);
                
                return json_encode([
                    'status' => 'success',
                    'message' => 'Document uploaded successfully',
                    'filename' => $filename
                ]);
            } else {
                return json_encode(['status' => 'error', 'message' => 'Failed to upload file']);
            }
        } catch(PDOException $e) {
            return json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
    }
    
    // Get kindergarten levels
    function getLevels() {
        include "connection-pdo.php";
        
        try {
            $stmt = $pdo->query("SELECT id, level_name FROM tbl_kindergarten_levels ORDER BY id");
            $levels = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            // Make sure the ID is an integer
            foreach ($levels as &$level) {
                $level['id'] = (int) $level['id'];
            }
            
            return [
                'status' => 'success', 
                'data' => $levels
            ];
        } catch(PDOException $e) {
            return [
                'status' => 'error', 
                'message' => $e->getMessage()
            ];
        }
    }
    
    // Get sections
    function getSections() {
        include "connection-pdo.php";
        
        try {
            $stmt = $pdo->query("SELECT s.*, k.level_name 
                FROM tbl_sections s
                JOIN tbl_kindergarten_levels k ON s.level_id = k.id
                ORDER BY s.level_id, s.section_name");
            $sections = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            return json_encode(['status' => 'success', 'data' => $sections]);
        } catch(PDOException $e) {
            return json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
    }
    
    // Enlist student to section
    function enlistStudent($json) {
        include "connection-pdo.php";
        $data = json_decode($json);
        
        // Validate input
        if (!isset($data->student_id) || !isset($data->section_id)) {
            return json_encode([
                'status' => 'error',
                'message' => 'Student ID and section ID are required'
            ]);
        }
        
        try {
            // Check if student exists and is enrolled
            $stmt = $pdo->prepare("SELECT level_id, schedule FROM tbl_students WHERE id = ? AND enrollment_status = 'enrolled'");
            $stmt->execute([$data->student_id]);
            $student = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$student) {
                return json_encode([
                    'status' => 'error',
                    'message' => 'Student not found or not enrolled'
                ]);
            }
            
            // Check if section exists and matches student's level and schedule
            $stmt = $pdo->prepare("SELECT * FROM tbl_sections WHERE id = ? AND level_id = ? AND schedule = ? AND status = 'active'");
            $stmt->execute([$data->section_id, $student['level_id'], $student['schedule']]);
            $section = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$section) {
                return json_encode([
                    'status' => 'error',
                    'message' => 'Section not found or incompatible with student level/schedule'
                ]);
            }
            
            // Check section capacity
            $stmt = $pdo->prepare("SELECT COUNT(*) as count FROM tbl_students WHERE section_id = ?");
            $stmt->execute([$data->section_id]);
            $count = $stmt->fetch(PDO::FETCH_ASSOC)['count'];
            
            if ($count >= $section['max_capacity']) {
                return json_encode([
                    'status' => 'error',
                    'message' => 'Section has reached maximum capacity'
                ]);
            }
            
            // Update student's section
            $stmt = $pdo->prepare("UPDATE tbl_students SET section_id = ? WHERE id = ?");
            $stmt->execute([$data->section_id, $data->student_id]);
            
            return json_encode([
                'status' => 'success',
                'message' => 'Student enlisted to section successfully'
            ]);
        } catch(PDOException $e) {
            return json_encode([
                'status' => 'error',
                'message' => 'Database error: ' . $e->getMessage()
            ]);
        }
    }
    
    // Remove student from section
    function removeFromSection($studentId) {
        include "connection-pdo.php";
        
        try {
            $stmt = $pdo->prepare("UPDATE tbl_students SET section_id = NULL WHERE id = ?");
            $stmt->execute([$studentId]);
            
            if ($stmt->rowCount() > 0) {
                return json_encode([
                    'status' => 'success',
                    'message' => 'Student removed from section successfully'
                ]);
            } else {
                return json_encode([
                    'status' => 'error',
                    'message' => 'Student not found'
                ]);
            }
        } catch(PDOException $e) {
            return json_encode([
                'status' => 'error',
                'message' => 'Database error: ' . $e->getMessage()
            ]);
        }
    }
    
    // Get students by section
    function getStudentsBySection($sectionId) {
        include "connection-pdo.php";
        
        try {
            $stmt = $pdo->prepare("
                SELECT s.*, u.name as parent_name 
                FROM tbl_students s 
                LEFT JOIN tbl_users u ON s.parent_id = u.id 
                WHERE s.section_id = ? AND s.enrollment_status = 'enrolled'
                ORDER BY s.name ASC
            ");
            $stmt->execute([$sectionId]);
            $students = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            return json_encode([
                'status' => 'success',
                'message' => 'Students retrieved successfully',
                'data' => $students
            ]);
        } catch(PDOException $e) {
            return json_encode([
                'status' => 'error',
                'message' => 'Database error: ' . $e->getMessage()
            ]);
        }
    }
}

// Handle requests
if ($_SERVER['REQUEST_METHOD'] == 'GET') {
    $operation = $_GET['operation'] ?? '';
    $json = isset($_GET['json']) ? $_GET['json'] : '{}';
    $id = isset($_GET['id']) ? $_GET['id'] : null;
    $parent_id = isset($_GET['parent_id']) ? $_GET['parent_id'] : null;
} else if($_SERVER['REQUEST_METHOD'] == 'POST') {
    $operation = $_POST['operation'] ?? '';
    $json = isset($_POST['json']) ? $_POST['json'] : '{}';
    $id = isset($_POST['id']) ? $_POST['id'] : null;
    $parent_id = isset($_POST['parent_id']) ? $_POST['parent_id'] : null;
    $student_id = isset($_POST['student_id']) ? $_POST['student_id'] : null;
    $document_type = isset($_POST['document_type']) ? $_POST['document_type'] : null;
}

$student = new Student();
switch($operation) {
    case "addStudent":
        echo $student->addStudent($json);
        break;
    case "getStudentsByParent":
        echo $student->getStudentsByParent($parent_id);
        break;
    case "getAllStudents":
        echo $student->getAllStudents();
        break;
    case "getStudentById":
        echo $student->getStudentById($id);
        break;
    case "updateEnrollmentStatus":
        echo $student->updateEnrollmentStatus($json);
        break;
    case "uploadDocument":
        if (isset($_FILES['document'])) {
            echo $student->uploadDocument($student_id, $document_type, $_FILES['document']);
        } else {
            echo json_encode(['status' => 'error', 'message' => 'No file uploaded']);
        }
        break;
    case "getSections":
        echo $student->getSections();
        break;
    case "getLevels":
        // Return the levels with proper JSON encoding
        echo json_encode($student->getLevels());
        break;
    case "getEmergencyContact":
        getEmergencyContact($pdo);
        break;
    case "getAllDocuments":
        echo getAllDocuments();
        break;
    case "getGradeLevels":
        echo getGradeLevels();
        break;
    case "approveDocument":
        echo approveDocument();
        break;
    case "rejectDocument":
        echo rejectDocument();
        break;
    case "enlistStudent":
        if (isset($_POST['json'])) {
            echo $student->enlistStudent($_POST['json']);
        } else {
            echo json_encode(['status' => 'error', 'message' => 'No data provided']);
        }
        break;
    case "removeFromSection":
        if (isset($_POST['student_id'])) {
            echo $student->removeFromSection($_POST['student_id']);
        } else {
            echo json_encode(['status' => 'error', 'message' => 'Student ID required']);
        }
        break;
    case "getStudentsBySection":
        if (isset($_POST['section_id'])) {
            echo $student->getStudentsBySection($_POST['section_id']);
        } else {
            echo json_encode(['status' => 'error', 'message' => 'Section ID required']);
        }
        break;
    default:
        echo json_encode(['status' => 'error', 'message' => 'Invalid operation']);
}

// Function to get emergency contact information for a student
function getEmergencyContact($pdo) {
    global $response;
    
    // Check if student_id is provided
    if (!isset($_GET['student_id'])) {
        $response['status'] = 'error';
        $response['message'] = 'Student ID is required';
        echo json_encode($response);
        return;
    }
    
    try {
        $studentId = $_GET['student_id'];
        
        // Query the emergency contacts table
        $query = "SELECT * FROM tbl_emergency_contacts WHERE student_id = :student_id";
        $stmt = $pdo->prepare($query);
        $stmt->execute(['student_id' => $studentId]);
        
        if ($stmt->rowCount() > 0) {
            // Emergency contact found
            $emergencyContact = $stmt->fetch(PDO::FETCH_ASSOC);
            $response['status'] = 'success';
            $response['data'] = $emergencyContact;
        } else {
            // Try to get parent info as fallback
            $query = "SELECT u.* FROM tbl_users u 
                      JOIN tbl_students s ON u.id = s.parent_id 
                      WHERE s.id = :student_id";
            $stmt = $pdo->prepare($query);
            $stmt->execute(['student_id' => $studentId]);
            
            if ($stmt->rowCount() > 0) {
                $parent = $stmt->fetch(PDO::FETCH_ASSOC);
                // Create a simulated emergency contact from parent data
                $emergencyContact = [
                    'guardian_name' => $parent['name'],
                    'relationship' => 'Parent',
                    'contact_number' => $parent['phone'] ?? 'Not provided',
                    'email' => $parent['email'] ?? 'Not provided',
                    'emergency_contact_name' => 'Same as Guardian',
                    'emergency_contact_number' => $parent['phone'] ?? 'Not provided'
                ];
                $response['status'] = 'success';
                $response['data'] = $emergencyContact;
                $response['note'] = 'Using parent data as fallback';
            } else {
                $response['status'] = 'error';
                $response['message'] = 'No emergency contact information found';
            }
        }
    } catch (PDOException $e) {
        $response['status'] = 'error';
        $response['message'] = 'Database error: ' . $e->getMessage();
    }
    
    echo json_encode($response);
}

// Get all documents with student information
function getAllDocuments() {
    include "connection-pdo.php";
    
    // Check for admin authorization
    $user_id = $_SERVER['HTTP_X_AUTH_USER'] ?? null;
    $user_role = $_SERVER['HTTP_X_AUTH_ROLE'] ?? null;
    
    if (!$user_id || $user_role !== 'admin') {
        return json_encode(['status' => 'error', 'message' => 'Unauthorized access']);
    }
    
    try {
        // Get all students with their document data and level information
        $stmt = $pdo->prepare("
            SELECT 
                d.*, 
                s.name, 
                s.parent_id,
                k.level_name
            FROM 
                tbl_required_documents d
            JOIN 
                tbl_students s ON d.student_id = s.id
            LEFT JOIN 
                tbl_kindergarten_levels k ON s.level_id = k.id
            ORDER BY 
                s.name
        ");
        $stmt->execute();
        
        $documents = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        return json_encode([
            'status' => 'success',
            'data' => $documents
        ]);
    } catch(PDOException $e) {
        return json_encode(['status' => 'error', 'message' => $e->getMessage()]);
    }
}

// Get all grade levels
function getGradeLevels() {
    include "connection-pdo.php";
    
    try {
        $stmt = $pdo->prepare("SELECT id, level_name FROM tbl_kindergarten_levels ORDER BY id");
        $stmt->execute();
        
        $levels = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        return json_encode([
            'status' => 'success',
            'data' => $levels
        ]);
    } catch(PDOException $e) {
        return json_encode(['status' => 'error', 'message' => $e->getMessage()]);
    }
}

// Handle document approval (GET) - this is for compatibility
function approveDocument() {
    // Check if request is GET
    if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
        return json_encode(['status' => 'error', 'message' => 'Invalid request method']);
    }
    
    // Get parameters
    $studentId = $_GET['student_id'] ?? null;
    $documentType = $_GET['document_type'] ?? null;
    
    if (!$studentId || !$documentType) {
        return json_encode(['status' => 'error', 'message' => 'Missing required parameters']);
    }
    
    return approveDocumentInternal($studentId, $documentType);
}

// Handle document approval (POST) - for JSON requests
function approveDocumentPost($data) {
    // Check if all required parameters are present
    if (!isset($data->student_id) || !isset($data->document_type)) {
        return json_encode(['status' => 'error', 'message' => 'Missing required parameters']);
    }
    
    return approveDocumentInternal($data->student_id, $data->document_type);
}

// Internal function to approve document
function approveDocumentInternal($studentId, $documentType) {
    include "connection-pdo.php";
    
    // Check for admin authorization
    $user_id = $_SERVER['HTTP_X_AUTH_USER'] ?? null;
    $user_role = $_SERVER['HTTP_X_AUTH_ROLE'] ?? null;
    
    if (!$user_id || $user_role !== 'admin') {
        return json_encode(['status' => 'error', 'message' => 'Unauthorized access']);
    }
    
    // Map document type to the appropriate field
    $fieldStatus = '';
    switch($documentType) {
        case 'birth_certificate':
            $fieldStatus = 'birth_certificate_status';
            break;
        case 'id_picture':
            $fieldStatus = 'id_picture_status';
            break;
        case 'medical_certificate':
            $fieldStatus = 'medical_certificate_status';
            break;
        case 'report_card':
            $fieldStatus = 'report_card_status';
            break;
        default:
            return json_encode(['status' => 'error', 'message' => 'Invalid document type']);
    }
    
    try {
        // Update document status to approved (1)
        $stmt = $pdo->prepare("
            UPDATE tbl_required_documents 
            SET $fieldStatus = 1
            WHERE student_id = ?
        ");
        $stmt->execute([$studentId]);
        
        if ($stmt->rowCount() > 0) {
            return json_encode([
                'status' => 'success',
                'message' => 'Document approved successfully'
            ]);
        } else {
            return json_encode([
                'status' => 'error',
                'message' => 'Document not found or already approved'
            ]);
        }
    } catch(PDOException $e) {
        return json_encode(['status' => 'error', 'message' => $e->getMessage()]);
    }
}

// Handle document rejection (GET) - this is for compatibility
function rejectDocument() {
    // Check if request is GET
    if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
        return json_encode(['status' => 'error', 'message' => 'Invalid request method']);
    }
    
    // Get parameters
    $studentId = $_GET['student_id'] ?? null;
    $documentType = $_GET['document_type'] ?? null;
    $reason = $_GET['reason'] ?? 'Document rejected';
    
    if (!$studentId || !$documentType) {
        return json_encode(['status' => 'error', 'message' => 'Missing required parameters']);
    }
    
    return rejectDocumentInternal($studentId, $documentType, $reason);
}

// Handle document rejection (POST) - for JSON requests
function rejectDocumentPost($data) {
    // Check if all required parameters are present
    if (!isset($data->student_id) || !isset($data->document_type)) {
        return json_encode(['status' => 'error', 'message' => 'Missing required parameters']);
    }
    
    $reason = $data->reason ?? 'Document rejected';
    
    return rejectDocumentInternal($data->student_id, $data->document_type, $reason);
}

// Internal function to reject document
function rejectDocumentInternal($studentId, $documentType, $reason) {
    include "connection-pdo.php";
    
    // Check for admin authorization
    $user_id = $_SERVER['HTTP_X_AUTH_USER'] ?? null;
    $user_role = $_SERVER['HTTP_X_AUTH_ROLE'] ?? null;
    
    if (!$user_id || $user_role !== 'admin') {
        return json_encode(['status' => 'error', 'message' => 'Unauthorized access']);
    }
    
    // Map document type to the appropriate field
    $fieldStatus = '';
    $fieldFile = '';
    switch($documentType) {
        case 'birth_certificate':
            $fieldStatus = 'birth_certificate_status';
            $fieldFile = 'birth_certificate_file';
            break;
        case 'id_picture':
            $fieldStatus = 'id_picture_status';
            $fieldFile = 'id_picture_file';
            break;
        case 'medical_certificate':
            $fieldStatus = 'medical_certificate_status';
            $fieldFile = 'medical_certificate_file';
            break;
        case 'report_card':
            $fieldStatus = 'report_card_status';
            $fieldFile = 'report_card_file';
            break;
        default:
            return json_encode(['status' => 'error', 'message' => 'Invalid document type']);
    }
    
    try {
        // Begin transaction
        $pdo->beginTransaction();
        
        // Get current file path if it exists
        $stmt = $pdo->prepare("SELECT $fieldFile FROM tbl_required_documents WHERE student_id = ?");
        $stmt->execute([$studentId]);
        $document = $stmt->fetch(PDO::FETCH_ASSOC);
        
        // If file exists, we might want to keep a record or move it to a rejected folder
        
        // Update document status to rejected and clear file path
        $stmt = $pdo->prepare("
            UPDATE tbl_required_documents 
            SET $fieldStatus = 0, $fieldFile = NULL
            WHERE student_id = ?
        ");
        $stmt->execute([$studentId]);
        
        // Add a notification or log for the rejection reason
        // This would be implemented in a real system
        
        $pdo->commit();
        
        return json_encode([
            'status' => 'success',
            'message' => 'Document rejected successfully'
        ]);
    } catch(PDOException $e) {
        $pdo->rollBack();
        return json_encode(['status' => 'error', 'message' => $e->getMessage()]);
    }
}
?> 