<?php
header('Content-Type: application/json');

include "connection-pdo.php";

try {
    // Check if the table exists
    $stmt = $pdo->query("SHOW TABLES LIKE 'tbl_kindergarten_levels'");
    $tableExists = $stmt->rowCount() > 0;
    
    $message = '';
    
    if (!$tableExists) {
        // Create the table with proper structure
        $pdo->exec("CREATE TABLE tbl_kindergarten_levels (
            id INT AUTO_INCREMENT PRIMARY KEY,
            level_name VARCHAR(255) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )");
        
        $message = 'Table created successfully';
    } else {
        // Check table structure and fix if needed
        $stmt = $pdo->query("DESCRIBE tbl_kindergarten_levels");
        $columns = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        $needsIdFix = true;
        
        foreach ($columns as $column) {
            if ($column['Field'] === 'id' && 
                $column['Key'] === 'PRI' && 
                strpos($column['Extra'], 'auto_increment') !== false) {
                $needsIdFix = false;
                break;
            }
        }
        
        if ($needsIdFix) {
            // Start a transaction for the modifications
            $pdo->beginTransaction();
            
            try {
                // Drop existing table content
                $pdo->exec("TRUNCATE TABLE tbl_kindergarten_levels");
                
                // Alter the table to fix the ID column
                $pdo->exec("ALTER TABLE tbl_kindergarten_levels MODIFY id INT AUTO_INCREMENT PRIMARY KEY");
                
                // Re-insert the data
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
                
                $message = 'Table structure fixed and data re-inserted';
            } catch(PDOException $e) {
                // Rollback the transaction if something went wrong
                $pdo->rollBack();
                throw $e; // Re-throw for the outer catch block
            }
        } else {
            $message = 'Table structure is already correct';
        }
    }
    
    // Verify the structure and get the data
    $stmt = $pdo->query("SELECT * FROM tbl_kindergarten_levels");
    $data = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Return a single JSON response with all the information
    echo json_encode([
        'status' => 'success', 
        'message' => $message,
        'data' => $data
    ]);
    
} catch(PDOException $e) {
    echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
}
?> 