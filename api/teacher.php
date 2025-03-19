<?php
header('Content-Type: application/json');
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

// Include connection files

include_once "connection-pdo.php";

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    exit(0);
}

class Teacher {
    // Get all teachers
    function getAllTeachers() {
        include "connection-pdo.php";
        
        try {
            $stmt = $pdo->prepare("SELECT * FROM tbl_teachers ORDER BY name ASC");
            $stmt->execute();
            $teachers = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            return json_encode([
                'status' => 'success',
                'message' => 'Teachers retrieved successfully',
                'data' => $teachers
            ]);
        } catch(PDOException $e) {
            return json_encode([
                'status' => 'error',
                'message' => 'Database error: ' . $e->getMessage()
            ]);
        }
    }
    
    // Get teacher by ID
    function getTeacherById($id) {
        include "connection-pdo.php";
        
        try {
            $stmt = $pdo->prepare("SELECT * FROM tbl_teachers WHERE id = ?");
            $stmt->execute([$id]);
            $teacher = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if ($teacher) {
                return json_encode([
                    'status' => 'success',
                    'message' => 'Teacher retrieved successfully',
                    'data' => $teacher
                ]);
            } else {
                return json_encode([
                    'status' => 'error',
                    'message' => 'Teacher not found'
                ]);
            }
        } catch(PDOException $e) {
            return json_encode([
                'status' => 'error',
                'message' => 'Database error: ' . $e->getMessage()
            ]);
        }
    }
    
    // Add new teacher
    function addTeacher($json) {
        include "connection-pdo.php";
        $data = json_decode($json);
        
        // Validate input
        if (!isset($data->name) || !isset($data->email)) {
            return json_encode([
                'status' => 'error',
                'message' => 'Name and email are required'
            ]);
        }
        
        try {
            // Check if email already exists
            $stmt = $pdo->prepare("SELECT id FROM tbl_teachers WHERE email = ?");
            $stmt->execute([$data->email]);
            if ($stmt->fetch()) {
                return json_encode([
                    'status' => 'error',
                    'message' => 'Email already exists'
                ]);
            }
            
            $stmt = $pdo->prepare("INSERT INTO tbl_teachers (name, email, phone, specialization, qualification, status) 
                VALUES (?, ?, ?, ?, ?, ?)");
            
            $stmt->execute([
                $data->name,
                $data->email,
                $data->phone ?? null,
                $data->specialization ?? null,
                $data->qualification ?? null,
                $data->status ?? 'active'
            ]);
            
            $teacherId = $pdo->lastInsertId();
            
            return json_encode([
                'status' => 'success',
                'message' => 'Teacher added successfully',
                'data' => ['id' => $teacherId]
            ]);
        } catch(PDOException $e) {
            return json_encode([
                'status' => 'error',
                'message' => 'Database error: ' . $e->getMessage()
            ]);
        }
    }
    
    // Update teacher
    function updateTeacher($json) {
        include "connection-pdo.php";
        $data = json_decode($json);
        
        // Validate input
        if (!isset($data->id) || !isset($data->name) || !isset($data->email)) {
            return json_encode([
                'status' => 'error',
                'message' => 'ID, name and email are required'
            ]);
        }
        
        try {
            // Check if email already exists for another teacher
            $stmt = $pdo->prepare("SELECT id FROM tbl_teachers WHERE email = ? AND id != ?");
            $stmt->execute([$data->email, $data->id]);
            if ($stmt->fetch()) {
                return json_encode([
                    'status' => 'error',
                    'message' => 'Email already exists for another teacher'
                ]);
            }
            
            $stmt = $pdo->prepare("UPDATE tbl_teachers SET 
                name = ?, 
                email = ?, 
                phone = ?, 
                specialization = ?, 
                qualification = ?, 
                status = ? 
                WHERE id = ?");
            
            $result = $stmt->execute([
                $data->name,
                $data->email,
                $data->phone ?? null,
                $data->specialization ?? null,
                $data->qualification ?? null,
                $data->status ?? 'active',
                $data->id
            ]);
            
            if ($result) {
                return json_encode([
                    'status' => 'success',
                    'message' => 'Teacher updated successfully'
                ]);
            } else {
                return json_encode([
                    'status' => 'error',
                    'message' => 'No changes made or teacher not found'
                ]);
            }
        } catch(PDOException $e) {
            return json_encode([
                'status' => 'error',
                'message' => 'Database error: ' . $e->getMessage()
            ]);
        }
    }
    
    // Delete teacher
    function deleteTeacher($id) {
        include "connection-pdo.php";
        
        try {
            // Check if teacher is assigned to sections
            $stmt = $pdo->prepare("SELECT id FROM tbl_sections WHERE teacher_id = ?");
            $stmt->execute([$id]);
            if ($stmt->fetch()) {
                return json_encode([
                    'status' => 'error',
                    'message' => 'Cannot delete teacher. Teacher is assigned to one or more sections.'
                ]);
            }
            
            $stmt = $pdo->prepare("DELETE FROM tbl_teachers WHERE id = ?");
            $stmt->execute([$id]);
            
            if ($stmt->rowCount() > 0) {
                return json_encode([
                    'status' => 'success',
                    'message' => 'Teacher deleted successfully'
                ]);
            } else {
                return json_encode([
                    'status' => 'error',
                    'message' => 'Teacher not found'
                ]);
            }
        } catch(PDOException $e) {
            return json_encode([
                'status' => 'error',
                'message' => 'Database error: ' . $e->getMessage()
            ]);
        }
    }
}

// Handle API requests
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $teacher = new Teacher();
    
    if (isset($_POST['operation'])) {
        $operation = $_POST['operation'];
        
        switch ($operation) {
            case 'getAllTeachers':
                echo $teacher->getAllTeachers();
                break;
            
            case 'getTeacherById':
                if (isset($_POST['id'])) {
                    echo $teacher->getTeacherById($_POST['id']);
                } else {
                    echo json_encode(['status' => 'error', 'message' => 'Teacher ID required']);
                }
                break;
            
            case 'addTeacher':
                if (isset($_POST['json'])) {
                    echo $teacher->addTeacher($_POST['json']);
                } else {
                    echo json_encode(['status' => 'error', 'message' => 'No data provided']);
                }
                break;
            
            case 'updateTeacher':
                if (isset($_POST['json'])) {
                    echo $teacher->updateTeacher($_POST['json']);
                } else {
                    echo json_encode(['status' => 'error', 'message' => 'No data provided']);
                }
                break;
            
            case 'deleteTeacher':
                if (isset($_POST['id'])) {
                    echo $teacher->deleteTeacher($_POST['id']);
                } else {
                    echo json_encode(['status' => 'error', 'message' => 'Teacher ID required']);
                }
                break;
            
            default:
                echo json_encode(['status' => 'error', 'message' => 'Invalid operation']);
        }
    } else {
        echo json_encode(['status' => 'error', 'message' => 'No operation specified']);
    }
}
?> 