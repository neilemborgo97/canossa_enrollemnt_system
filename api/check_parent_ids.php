<?php
// Include database connection
require_once 'connection-pdo.php';

try {
    // Get all students with their parent_id values
    $query = "SELECT id, name, parent_id FROM tbl_students";
    $stmt = $pdo->query($query);
    $students = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo "Found " . count($students) . " students:\n";
    foreach ($students as $student) {
        echo "Student ID: {$student['id']}, Name: {$student['name']}, Parent ID: " . 
             ($student['parent_id'] ? $student['parent_id'] : 'NULL') . "\n";
    }
    
    // Create unique list of parent IDs
    $parentIds = [];
    foreach ($students as $student) {
        if ($student['parent_id'] && !in_array($student['parent_id'], $parentIds)) {
            $parentIds[] = $student['parent_id'];
        }
    }
    
    echo "\nUnique parent IDs found: " . count($parentIds) . "\n";
    echo "Parent IDs: " . implode(', ', $parentIds) . "\n";
    
} catch (PDOException $e) {
    echo "Error: " . $e->getMessage();
}
?> 