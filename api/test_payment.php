<?php
// Include database connection
require_once 'connection-pdo.php';

// Set the content type to JSON
header('Content-Type: application/json');

// Function to test payment storage
function testPaymentStorage($pdo) {
    try {
        // Query to get all payments
        $query = "SELECT 
                    e.id,
                    e.student_id,
                    e.payment_status,
                    e.payment_date,
                    e.payment_amount,
                    e.payment_method,
                    e.payment_reference,
                    e.payment_type_id,
                    pt.name as payment_type_name,
                    s.name as student_name
                  FROM tbl_enrollments e
                  JOIN tbl_students s ON e.student_id = s.id
                  LEFT JOIN tbl_payment_types pt ON e.payment_type_id = pt.id
                  WHERE e.payment_date IS NOT NULL
                  ORDER BY e.student_id, e.payment_date DESC";
        
        $stmt = $pdo->query($query);
        $payments = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Group by student to see multiple payments
        $studentPayments = [];
        foreach ($payments as $payment) {
            $studentId = $payment['student_id'];
            if (!isset($studentPayments[$studentId])) {
                $studentPayments[$studentId] = [
                    'student_name' => $payment['student_name'],
                    'student_id' => $studentId,
                    'payments' => []
                ];
            }
            $studentPayments[$studentId]['payments'][] = [
                'id' => $payment['id'],
                'date' => $payment['payment_date'],
                'status' => $payment['payment_status'],
                'amount' => $payment['payment_amount'],
                'type' => $payment['payment_type_name']
            ];
        }
        
        // Count payments per student
        $paymentCounts = [];
        foreach ($studentPayments as $studentId => $data) {
            $paymentCounts[$studentId] = [
                'student_name' => $data['student_name'],
                'payment_count' => count($data['payments'])
            ];
        }
        
        $result = [
            'status' => 'success',
            'message' => 'Payment storage test',
            'total_payments' => count($payments),
            'payment_counts_by_student' => $paymentCounts,
            'detailed_payments' => $studentPayments
        ];
        
        echo json_encode($result, JSON_PRETTY_PRINT);
    } catch (PDOException $e) {
        $result = [
            'status' => 'error',
            'message' => 'Database error: ' . $e->getMessage()
        ];
        echo json_encode($result);
    }
}

// Run the test
testPaymentStorage($pdo);
?> 