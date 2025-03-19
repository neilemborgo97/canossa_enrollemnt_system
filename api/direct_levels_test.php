<?php
header('Content-Type: application/json');
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

include "connection-pdo.php";

// Direct test of the levels query
try {
    $stmt = $pdo->query("SELECT id, level_name FROM tbl_kindergarten_levels ORDER BY id");
    $levels = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Make sure the ID is an integer
    foreach ($levels as &$level) {
        $level['id'] = (int) $level['id'];
    }
    
    echo json_encode([
        'status' => 'success', 
        'data' => $levels
    ]);
} catch(PDOException $e) {
    echo json_encode([
        'status' => 'error', 
        'message' => $e->getMessage()
    ]);
}
?> 