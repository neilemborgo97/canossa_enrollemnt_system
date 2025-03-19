<?php
header('Content-Type: application/json');

include "connection-pdo.php";

try {
    // First check if there are already grade levels in the table
    $stmt = $pdo->query("SELECT COUNT(*) FROM tbl_kindergarten_levels");
    $count = $stmt->fetchColumn();
    
    if ($count > 0) {
        echo json_encode(['status' => 'info', 'message' => 'Grade levels already exist in the database.', 'count' => $count]);
        exit;
    }
    
    // Start a transaction
    $pdo->beginTransaction();
    
    // Insert kindergarten grade levels
    $gradeLevels = [
        ['level_name' => 'Nursery'],
        ['level_name' => 'Pre-Kindergarten'],
        ['level_name' => 'Kindergarten 1'],
        ['level_name' => 'Kindergarten 2']
    ];
    
    $stmt = $pdo->prepare("INSERT INTO tbl_kindergarten_levels (level_name) VALUES (?)");
    
    foreach ($gradeLevels as $level) {
        $stmt->execute([$level['level_name']]);
    }
    
    // Commit the transaction
    $pdo->commit();
    
    echo json_encode([
        'status' => 'success', 
        'message' => 'Grade levels successfully added to the database.',
        'grade_levels' => $gradeLevels
    ]);
} catch(PDOException $e) {
    // Rollback the transaction if something went wrong
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    
    echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
}
?> 