<?php
// Include database connection
require_once 'connection-pdo.php';

// Open file for writing
$outputFile = 'db_check_results.txt';
$fp = fopen($outputFile, 'w');

function writeOutput($fp, $message) {
    fwrite($fp, $message . "\n");
}

try {
    writeOutput($fp, "===== DATABASE CHECK =====\n");
    
    // Check students table
    writeOutput($fp, "1. STUDENTS TABLE:");
    $query = "SELECT id, name, parent_id FROM tbl_students";
    $stmt = $pdo->query($query);
    $students = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    writeOutput($fp, "Found " . count($students) . " students:");
    foreach ($students as $student) {
        writeOutput($fp, "Student ID: {$student['id']}, Name: {$student['name']}, Parent ID: {$student['parent_id']}");
    }
    writeOutput($fp, "");
    
    // Check enrollments table
    writeOutput($fp, "2. ENROLLMENTS TABLE:");
    $query = "SELECT id, student_id, payment_date, payment_amount, payment_status FROM tbl_enrollments LIMIT 20";
    $stmt = $pdo->query($query);
    $enrollments = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    writeOutput($fp, "Found " . count($enrollments) . " enrollments:");
    foreach ($enrollments as $enrollment) {
        $paymentDate = ($enrollment['payment_date']) ? $enrollment['payment_date'] : 'NULL';
        writeOutput($fp, "Enrollment ID: {$enrollment['id']}, Student ID: {$enrollment['student_id']}, Payment Date: {$paymentDate}, Amount: {$enrollment['payment_amount']}, Status: {$enrollment['payment_status']}");
    }
    writeOutput($fp, "");
    
    // Check payment details for each student
    writeOutput($fp, "3. PAYMENT DETAILS BY STUDENT:");
    foreach ($students as $student) {
        $studentId = $student['id'];
        $studentName = $student['name'];
        $parentId = $student['parent_id'];
        
        writeOutput($fp, "Student: {$studentName} (ID: {$studentId}, Parent ID: {$parentId})");
        
        // Get all payments for this student
        $query = "SELECT id, payment_date, payment_amount, payment_type_id, payment_status 
                 FROM tbl_enrollments 
                 WHERE student_id = :student_id AND payment_date IS NOT NULL
                 ORDER BY payment_date DESC";
        $stmt = $pdo->prepare($query);
        $stmt->execute(['student_id' => $studentId]);
        $payments = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        if (count($payments) > 0) {
            writeOutput($fp, "  Found " . count($payments) . " payments:");
            foreach ($payments as $payment) {
                writeOutput($fp, "    Payment ID: {$payment['id']}, Date: {$payment['payment_date']}, Amount: {$payment['payment_amount']}, Type ID: {$payment['payment_type_id']}, Status: {$payment['payment_status']}");
            }
        } else {
            writeOutput($fp, "  No payments found for this student.");
        }
        writeOutput($fp, "");
    }
    
    // Check getPaymentsByParent function
    writeOutput($fp, "4. TESTING getPaymentsByParent FUNCTION:");
    // For each student's parent, call the getPaymentsByParent function
    $testedParentIds = [];
    foreach ($students as $student) {
        $parentId = $student['parent_id'];
        
        if (!in_array($parentId, $testedParentIds) && $parentId) {
            writeOutput($fp, "Testing Parent ID: {$parentId}");
            $testedParentIds[] = $parentId;
            
            // Execute the query directly similar to the one in getPaymentsByParent function
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
            
            $stmt = $pdo->prepare($query);
            $stmt->execute(['parent_id' => $parentId]);
            $payments = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            writeOutput($fp, "  Query returned " . count($payments) . " results for parent ID {$parentId}");
            
            if (count($payments) > 0) {
                foreach ($payments as $payment) {
                    writeOutput($fp, "  Payment ID: {$payment['id']}, Student: {$payment['student_name']}, Date: {$payment['payment_date']}, Amount: {$payment['payment_amount']}, Type: {$payment['payment_type_name']}, Status: {$payment['payment_status']}");
                }
            }
            writeOutput($fp, "");
        }
    }
    
    writeOutput($fp, "===== END DATABASE CHECK =====");
    
} catch (PDOException $e) {
    writeOutput($fp, "DATABASE ERROR: " . $e->getMessage());
}

// Close the file
fclose($fp);

echo "Database check completed. Results written to {$outputFile}\n";
?> 