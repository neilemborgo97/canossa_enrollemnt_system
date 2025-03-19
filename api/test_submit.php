<?php
// Include database connection
require_once 'connection-pdo.php';

// This is a test script to submit a payment and verify it creates a new record
try {
    // Count current enrollments for student 1
    $stmt = $pdo->prepare("SELECT COUNT(*) FROM tbl_enrollments WHERE student_id = 1");
    $stmt->execute();
    $beforeCount = $stmt->fetchColumn();
    
    echo "Before submission: Student 1 has {$beforeCount} payment records\n";
    
    // Insert a test payment
    $stmt = $pdo->prepare("INSERT INTO tbl_enrollments (
        student_id, 
        enrollment_date, 
        payment_status, 
        payment_date, 
        payment_amount, 
        payment_method, 
        payment_reference, 
        payment_type_id,
        notes,
        created_at
    ) VALUES (1, CURDATE(), 'pending_approval', NOW(), 1000.00, 'Test', 'TEST123', 1, 'Test payment', NOW())");
    
    $stmt->execute();
    $newId = $pdo->lastInsertId();
    
    echo "Inserted new payment with ID: {$newId}\n";
    
    // Count enrollments after insertion
    $stmt = $pdo->prepare("SELECT COUNT(*) FROM tbl_enrollments WHERE student_id = 1");
    $stmt->execute();
    $afterCount = $stmt->fetchColumn();
    
    echo "After submission: Student 1 has {$afterCount} payment records\n";
    
    if ($afterCount > $beforeCount) {
        echo "SUCCESS: New payment record was created instead of updating existing one.\n";
    } else {
        echo "FAILURE: Payment record count did not increase.\n";
    }
    
    // Get all payments for student 1
    $stmt = $pdo->prepare("SELECT id, payment_date, payment_amount, payment_method, payment_status 
                          FROM tbl_enrollments 
                          WHERE student_id = 1 
                          ORDER BY payment_date DESC");
    $stmt->execute();
    $payments = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo "\nAll payments for student 1:\n";
    foreach ($payments as $payment) {
        echo "ID: {$payment['id']}, Date: {$payment['payment_date']}, Amount: {$payment['payment_amount']}, Status: {$payment['payment_status']}\n";
    }
    
} catch (PDOException $e) {
    echo "Error: " . $e->getMessage();
}
?> 