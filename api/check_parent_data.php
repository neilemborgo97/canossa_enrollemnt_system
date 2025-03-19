<?php
// Include database connection
require_once 'connection-pdo.php';

echo "===== DATABASE CHECK =====\n\n";

// 1. Check for parents
echo "1. CHECKING PARENTS:\n";
try {
    $query = "SELECT * FROM tbl_parents LIMIT 5";
    $stmt = $pdo->query($query);
    $parents = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    if (count($parents) > 0) {
        echo "Found " . count($parents) . " parents:\n";
        foreach ($parents as $parent) {
            echo "Parent ID: {$parent['id']}, Name: {$parent['name']}, Email: {$parent['email']}\n";
        }
    } else {
        echo "No parents found in the database.\n";
    }
} catch (PDOException $e) {
    echo "Error querying parents: " . $e->getMessage() . "\n";
}
echo "\n";

// 2. Check for students
echo "2. CHECKING STUDENTS:\n";
try {
    $query = "SELECT s.*, p.name as parent_name, p.email as parent_email 
              FROM tbl_students s 
              LEFT JOIN tbl_parents p ON s.parent_id = p.id 
              LIMIT 10";
    $stmt = $pdo->query($query);
    $students = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    if (count($students) > 0) {
        echo "Found " . count($students) . " students:\n";
        foreach ($students as $student) {
            echo "Student ID: {$student['id']}, Name: {$student['name']}, Parent ID: {$student['parent_id']}, Parent Name: {$student['parent_name']}\n";
        }
    } else {
        echo "No students found in the database.\n";
    }
} catch (PDOException $e) {
    echo "Error querying students: " . $e->getMessage() . "\n";
}
echo "\n";

// 3. Check for enrollments
echo "3. CHECKING ENROLLMENTS:\n";
try {
    $query = "SELECT * FROM tbl_enrollments LIMIT 10";
    $stmt = $pdo->query($query);
    $enrollments = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    if (count($enrollments) > 0) {
        echo "Found " . count($enrollments) . " enrollments:\n";
        foreach ($enrollments as $enrollment) {
            echo "Enrollment ID: {$enrollment['id']}, Student ID: {$enrollment['student_id']}, Payment Date: {$enrollment['payment_date']}, Amount: {$enrollment['payment_amount']}, Status: {$enrollment['payment_status']}\n";
        }
    } else {
        echo "No enrollments found in the database.\n";
    }
} catch (PDOException $e) {
    echo "Error querying enrollments: " . $e->getMessage() . "\n";
}
echo "\n";

// 4. Check for enrollments with payment dates
echo "4. CHECKING ENROLLMENTS WITH PAYMENT DATES:\n";
try {
    $query = "SELECT e.*, s.name as student_name, s.parent_id 
              FROM tbl_enrollments e
              JOIN tbl_students s ON e.student_id = s.id
              WHERE e.payment_date IS NOT NULL
              LIMIT 10";
    $stmt = $pdo->query($query);
    $paidEnrollments = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    if (count($paidEnrollments) > 0) {
        echo "Found " . count($paidEnrollments) . " enrollments with payment dates:\n";
        foreach ($paidEnrollments as $enrollment) {
            echo "Enrollment ID: {$enrollment['id']}, Student ID: {$enrollment['student_id']}, Student Name: {$enrollment['student_name']}, Parent ID: {$enrollment['parent_id']}, Payment Date: {$enrollment['payment_date']}, Amount: {$enrollment['payment_amount']}\n";
        }
    } else {
        echo "No enrollments with payment dates found in the database.\n";
    }
} catch (PDOException $e) {
    echo "Error querying enrollments with payment dates: " . $e->getMessage() . "\n";
}
echo "\n";

// 5. Check table structures
echo "5. TABLE STRUCTURE - tbl_enrollments:\n";
try {
    $query = "DESCRIBE tbl_enrollments";
    $stmt = $pdo->query($query);
    $columns = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    if (count($columns) > 0) {
        echo "tbl_enrollments structure:\n";
        foreach ($columns as $column) {
            echo "{$column['Field']} - {$column['Type']} - {$column['Null']} - {$column['Key']} - {$column['Default']}\n";
        }
    } else {
        echo "Could not retrieve table structure.\n";
    }
} catch (PDOException $e) {
    echo "Error querying table structure: " . $e->getMessage() . "\n";
}
echo "\n===== END DATABASE CHECK =====\n";
?> 