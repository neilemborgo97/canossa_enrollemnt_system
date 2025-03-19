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

class Section {
    // Get all sections
    function getAllSections() {
        include "connection-pdo.php";
        
        try {
            $stmt = $pdo->prepare("
                SELECT s.id, s.section_name, s.level_id, s.teacher_id, s.schedule, s.max_capacity, s.status, 
                       t.name as teacher_name, l.level_name 
                FROM tbl_sections s 
                LEFT JOIN tbl_teachers t ON s.teacher_id = t.id 
                LEFT JOIN tbl_kindergarten_levels l ON s.level_id = l.id 
                ORDER BY l.level_name, s.section_name ASC
            ");
            $stmt->execute();
            $sections = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            return json_encode([
                'status' => 'success',
                'message' => 'Sections retrieved successfully',
                'data' => $sections
            ]);
        } catch(PDOException $e) {
            return json_encode([
                'status' => 'error',
                'message' => 'Database error: ' . $e->getMessage()
            ]);
        }
    }
    
    // Get section by ID
    function getSectionById($id) {
        include "connection-pdo.php";
        
        try {
            $stmt = $pdo->prepare("
                SELECT s.*, t.name as teacher_name, l.level_name 
                FROM tbl_sections s 
                LEFT JOIN tbl_teachers t ON s.teacher_id = t.id 
                LEFT JOIN tbl_kindergarten_levels l ON s.level_id = l.id 
                WHERE s.id = ?
            ");
            $stmt->execute([$id]);
            $section = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if ($section) {
                return json_encode([
                    'status' => 'success',
                    'message' => 'Section retrieved successfully',
                    'data' => $section
                ]);
            } else {
                return json_encode([
                    'status' => 'error',
                    'message' => 'Section not found'
                ]);
            }
        } catch(PDOException $e) {
            return json_encode([
                'status' => 'error',
                'message' => 'Database error: ' . $e->getMessage()
            ]);
        }
    }
    
    // Add new section
    function addSection($json) {
        include "connection-pdo.php";
        $data = json_decode($json);
        
        // Validate input
        if (!isset($data->section_name) || !isset($data->level_id)) {
            return json_encode([
                'status' => 'error',
                'message' => 'Section name and level are required'
            ]);
        }
        
        try {
            // Check if section name already exists for the same level
            $stmt = $pdo->prepare("SELECT id FROM tbl_sections WHERE section_name = ? AND level_id = ?");
            $stmt->execute([$data->section_name, $data->level_id]);
            if ($stmt->fetch()) {
                return json_encode([
                    'status' => 'error',
                    'message' => 'Section name already exists for this level'
                ]);
            }
            
            $stmt = $pdo->prepare("INSERT INTO tbl_sections (section_name, level_id, teacher_id, schedule, max_capacity, description, status) 
                VALUES (?, ?, ?, ?, ?, ?, ?)");
            
            $stmt->execute([
                $data->section_name,
                $data->level_id,
                $data->teacher_id ?? null,
                $data->schedule ?? 'morning',
                $data->max_capacity ?? 30,
                $data->description ?? null,
                $data->status ?? 'active'
            ]);
            
            $sectionId = $pdo->lastInsertId();
            
            return json_encode([
                'status' => 'success',
                'message' => 'Section added successfully',
                'data' => ['id' => $sectionId]
            ]);
        } catch(PDOException $e) {
            return json_encode([
                'status' => 'error',
                'message' => 'Database error: ' . $e->getMessage()
            ]);
        }
    }
    
    // Update section
    function updateSection($json) {
        include "connection-pdo.php";
        $data = json_decode($json);
        
        // Validate input
        if (!isset($data->id) || !isset($data->section_name) || !isset($data->level_id)) {
            return json_encode([
                'status' => 'error',
                'message' => 'ID, section name and level are required'
            ]);
        }
        
        try {
            // Check if section name already exists for another section in the same level
            $stmt = $pdo->prepare("SELECT id FROM tbl_sections WHERE section_name = ? AND level_id = ? AND id != ?");
            $stmt->execute([$data->section_name, $data->level_id, $data->id]);
            if ($stmt->fetch()) {
                return json_encode([
                    'status' => 'error',
                    'message' => 'Section name already exists for this level'
                ]);
            }
            
            $stmt = $pdo->prepare("UPDATE tbl_sections SET 
                section_name = ?, 
                level_id = ?, 
                teacher_id = ?, 
                schedule = ?, 
                max_capacity = ?, 
                description = ?, 
                status = ? 
                WHERE id = ?");
            
            $result = $stmt->execute([
                $data->section_name,
                $data->level_id,
                $data->teacher_id ?? null,
                $data->schedule ?? 'morning',
                $data->max_capacity ?? 30,
                $data->description ?? null,
                $data->status ?? 'active',
                $data->id
            ]);
            
            if ($result) {
                return json_encode([
                    'status' => 'success',
                    'message' => 'Section updated successfully'
                ]);
            } else {
                return json_encode([
                    'status' => 'error',
                    'message' => 'No changes made or section not found'
                ]);
            }
        } catch(PDOException $e) {
            return json_encode([
                'status' => 'error',
                'message' => 'Database error: ' . $e->getMessage()
            ]);
        }
    }
    
    // Delete section
    function deleteSection($id) {
        include "connection-pdo.php";
        
        try {
            // Check if section has students
            $stmt = $pdo->prepare("SELECT id FROM tbl_students WHERE section_id = ?");
            $stmt->execute([$id]);
            if ($stmt->fetch()) {
                return json_encode([
                    'status' => 'error',
                    'message' => 'Cannot delete section. Section has enrolled students.'
                ]);
            }
            
            $stmt = $pdo->prepare("DELETE FROM tbl_sections WHERE id = ?");
            $stmt->execute([$id]);
            
            if ($stmt->rowCount() > 0) {
                return json_encode([
                    'status' => 'success',
                    'message' => 'Section deleted successfully'
                ]);
            } else {
                return json_encode([
                    'status' => 'error',
                    'message' => 'Section not found'
                ]);
            }
        } catch(PDOException $e) {
            return json_encode([
                'status' => 'error',
                'message' => 'Database error: ' . $e->getMessage()
            ]);
        }
    }
    
    // Get sections by level
    function getSectionsByLevel($levelId) {
        include "connection-pdo.php";
        
        try {
            $stmt = $pdo->prepare("
                SELECT s.*, t.name as teacher_name 
                FROM tbl_sections s 
                LEFT JOIN tbl_teachers t ON s.teacher_id = t.id 
                WHERE s.level_id = ? AND s.status = 'active'
                ORDER BY s.section_name ASC
            ");
            $stmt->execute([$levelId]);
            $sections = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            return json_encode([
                'status' => 'success',
                'message' => 'Sections retrieved successfully',
                'data' => $sections
            ]);
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
    $section = new Section();
    
    if (isset($_POST['operation'])) {
        $operation = $_POST['operation'];
        
        switch ($operation) {
            case 'getAllSections':
                echo $section->getAllSections();
                break;
            
            case 'getSectionById':
                if (isset($_POST['id'])) {
                    echo $section->getSectionById($_POST['id']);
                } else {
                    echo json_encode(['status' => 'error', 'message' => 'Section ID required']);
                }
                break;
            
            case 'addSection':
                if (isset($_POST['json'])) {
                    echo $section->addSection($_POST['json']);
                } else {
                    echo json_encode(['status' => 'error', 'message' => 'No data provided']);
                }
                break;
            
            case 'updateSection':
                if (isset($_POST['json'])) {
                    echo $section->updateSection($_POST['json']);
                } else {
                    echo json_encode(['status' => 'error', 'message' => 'No data provided']);
                }
                break;
            
            case 'deleteSection':
                if (isset($_POST['id'])) {
                    echo $section->deleteSection($_POST['id']);
                } else {
                    echo json_encode(['status' => 'error', 'message' => 'Section ID required']);
                }
                break;
            
            case 'getSectionsByLevel':
                if (isset($_POST['level_id'])) {
                    echo $section->getSectionsByLevel($_POST['level_id']);
                } else {
                    echo json_encode(['status' => 'error', 'message' => 'Level ID required']);
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