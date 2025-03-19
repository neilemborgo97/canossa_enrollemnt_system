<?php
header('Content-Type: application/json');

include "connection-pdo.php";

// Same function that's in student.php, using PDO
function getLevels() {
    global $pdo;
    
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

// Now also test with mysqli
function getLevelsWithMysqli() {
    include "connection.php";
    
    try {
        $query = "SELECT id, level_name FROM tbl_kindergarten_levels ORDER BY id";
        $result = mysqli_query($conn, $query);
        
        if (!$result) {
            throw new Exception(mysqli_error($conn));
        }
        
        $levels = [];
        while ($row = mysqli_fetch_assoc($result)) {
            $levels[] = [
                'id' => (int)$row['id'],
                'level_name' => $row['level_name']
            ];
        }
        
        return [
            'status' => 'success',
            'data' => $levels
        ];
    } catch (Exception $e) {
        return [
            'status' => 'error',
            'message' => $e->getMessage()
        ];
    }
}

// Print the results
echo "PDO Version:\n";
echo json_encode(getLevels(), JSON_PRETTY_PRINT);

echo "\n\nMySQLi Version:\n";
echo json_encode(getLevelsWithMysqli(), JSON_PRETTY_PRINT);
?> 