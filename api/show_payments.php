<?php
// Include database connection
require_once 'connection-pdo.php';

// Simple script to show all payments for student 1
try {
    // Get all payments for student 1
    $stmt = $pdo->prepare("SELECT id, payment_date, payment_amount, payment_method, payment_status, created_at 
                          FROM tbl_enrollments 
                          WHERE student_id = 1 
                          ORDER BY payment_date DESC");
    $stmt->execute();
    $payments = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo "Total payments for student 1: " . count($payments) . "\n\n";
    
    foreach ($payments as $payment) {
        echo "ID: {$payment['id']}, Date: {$payment['payment_date']}, Amount: {$payment['payment_amount']}, Status: {$payment['payment_status']}, Created: {$payment['created_at']}\n";
    }
    
} catch (PDOException $e) {
    echo "Error: " . $e->getMessage();
}
?> 