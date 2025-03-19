<?php
// Include database connection
require_once 'connection-pdo.php';

// Debug: Check if connection is established
echo "Database connection test\n";
try {
    $test = $pdo->query("SELECT 1");
    echo "Connection successful\n\n";
} catch (PDOException $e) {
    echo "Connection failed: " . $e->getMessage() . "\n\n";
    exit;
}

// Simulating API call to getPaymentsByParent
function getPaymentsByParent($pdo, $parentId) {
    try {
        echo "Running query for parent ID: {$parentId}\n";
        
        // Query to get ALL payments for students of this parent, not limited by student
        $query = "SELECT e.*, 
                    pt.name as payment_type_name,
                    s.name as student_name,
                    s.level_id,
                    l.level_name
                  FROM tbl_enrollments e
                  JOIN tbl_students s ON e.student_id = s.id
                  LEFT JOIN tbl_payment_types pt ON e.payment_type_id = pt.id
                  LEFT JOIN tbl_kindergarten_levels l ON s.level_id = l.id
                  WHERE s.parent_id = :parent_id
                  AND e.payment_date IS NOT NULL
                  ORDER BY e.payment_date DESC";
        
        echo "Query: {$query}\n";
        
        $stmt = $pdo->prepare($query);
        $stmt->execute(['parent_id' => $parentId]);
        
        $payments = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        echo "Query executed, found " . count($payments) . " payment records\n\n";
        
        // Ensure numeric fields are properly cast as integers
        foreach ($payments as &$payment) {
            if (isset($payment['id'])) {
                $payment['id'] = (int) $payment['id'];
            }
            if (isset($payment['student_id'])) {
                $payment['student_id'] = (int) $payment['student_id'];
            }
        }
        
        return [
            'status' => 'success',
            'data' => $payments,
            'count' => count($payments)
        ];
    } catch (PDOException $e) {
        echo "Database error occurred: " . $e->getMessage() . "\n";
        return [
            'status' => 'error',
            'message' => 'Database error: ' . $e->getMessage()
        ];
    }
}

// Test with parent ID 1
$parentId = 1;
$result = getPaymentsByParent($pdo, $parentId);

echo "Results for parent ID {$parentId}:\n";
echo "Status: {$result['status']}\n";
echo "Payment count: {$result['count']}\n\n";

if ($result['status'] === 'success' && $result['count'] > 0) {
    echo "Payments by student:\n";
    $studentPayments = [];
    
    foreach ($result['data'] as $payment) {
        $studentId = $payment['student_id'];
        $studentName = $payment['student_name'] ?? "Unknown Student";
        
        if (!isset($studentPayments[$studentId])) {
            $studentPayments[$studentId] = [
                'name' => $studentName,
                'count' => 0,
                'payments' => []
            ];
        }
        
        $studentPayments[$studentId]['count']++;
        $studentPayments[$studentId]['payments'][] = [
            'id' => $payment['id'] ?? 'N/A',
            'date' => $payment['payment_date'] ?? 'N/A',
            'amount' => $payment['payment_amount'] ?? 'N/A',
            'type' => $payment['payment_type_name'] ?? 'N/A',
            'status' => $payment['payment_status'] ?? 'N/A'
        ];
    }
    
    foreach ($studentPayments as $studentId => $data) {
        echo "Student {$data['name']} (ID: {$studentId}) - {$data['count']} payments:\n";
        foreach ($data['payments'] as $payment) {
            echo "  ID: {$payment['id']}, Date: {$payment['date']}, Amount: {$payment['amount']}, Type: {$payment['type']}, Status: {$payment['status']}\n";
        }
        echo "\n";
    }
} else {
    echo "No payments found or error occurred.\n";
    var_dump($result);
}
?> 