<?php
// Include database connection
require_once 'connection-pdo.php';

// Set the content type to JSON
header('Content-Type: application/json');

try {
    // Get table structure
    $stmt = $pdo->query('DESCRIBE tbl_enrollments');
    $columns = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Get sample data
    $data = $pdo->query('SELECT * FROM tbl_enrollments LIMIT 5')->fetchAll(PDO::FETCH_ASSOC);
    
    $result = [
        'status' => 'success',
        'table_structure' => $columns,
        'sample_data' => $data
    ];
    
    echo json_encode($result, JSON_PRETTY_PRINT);
} catch (PDOException $e) {
    $result = [
        'status' => 'error',
        'message' => 'Database error: ' . $e->getMessage()
    ];
    echo json_encode($result);
}
?> 