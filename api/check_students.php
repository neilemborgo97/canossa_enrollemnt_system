<?php
// Include database connection
require_once 'connection-pdo.php';

try {
    // Get all students
    $query = "SELECT id, name, parent_id FROM tbl_students";
    $stmt = $pdo->query($query);
    $students = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo "Found " . count($students) . " students:\n";
    foreach ($students as $student) {
        echo "Student ID: {$student['id']}, Name: {$student['name']}, Parent ID: {$student['parent_id']}\n";
    }
    
    // Check enrollment count for each student
    echo "\nEnrollment counts by student:\n";
    foreach ($students as $student) {
        $studentId = $student['id'];
        $query = "SELECT COUNT(*) as count FROM tbl_enrollments WHERE student_id = :student_id";
        $stmt = $pdo->prepare($query);
        $stmt->execute(['student_id' => $studentId]);
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        
        echo "Student {$student['name']} (ID: {$studentId}) - Enrollments: {$result['count']}\n";
        
        // Check payments for this student
        $query = "SELECT COUNT(*) as count FROM tbl_enrollments 
                 WHERE student_id = :student_id AND payment_date IS NOT NULL";
        $stmt = $pdo->prepare($query);
        $stmt->execute(['student_id' => $studentId]);
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        
        echo "  Payments: {$result['count']}\n";
        
        if ($result['count'] > 0) {
            $query = "SELECT id, payment_date, payment_amount, payment_status 
                     FROM tbl_enrollments 
                     WHERE student_id = :student_id AND payment_date IS NOT NULL
                     ORDER BY payment_date DESC";
            $stmt = $pdo->prepare($query);
            $stmt->execute(['student_id' => $studentId]);
            $payments = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            foreach ($payments as $payment) {
                echo "    Payment ID: {$payment['id']}, Date: {$payment['payment_date']}, Amount: {$payment['payment_amount']}, Status: {$payment['payment_status']}\n";
            }
        }
        
        echo "\n";
    }
    
} catch (PDOException $e) {
    echo "Database error: " . $e->getMessage() . "\n";
}
?> 