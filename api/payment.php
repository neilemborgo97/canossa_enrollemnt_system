<?php
// Include database connection
require_once 'connection-pdo.php';
// Include auth check functions but handle authentication in this file too
if (file_exists('auth_check.php')) {
    require_once 'auth_check.php';
}

// Create a response array
$response = array();

// Enable CORS
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type, X-Auth-User, X-Auth-Role");
header("Content-Type: application/json");

// Handle OPTIONS pre-flight request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Custom authentication check (fallback if session auth fails)
function checkCustomAuth() {
    // Check for custom auth headers
    if (isset($_SERVER['HTTP_X_AUTH_USER']) && isset($_SERVER['HTTP_X_AUTH_ROLE'])) {
        return [
            'id' => $_SERVER['HTTP_X_AUTH_USER'],
            'role' => $_SERVER['HTTP_X_AUTH_ROLE']
        ];
    }
    
    // No custom auth found
    return null;
}

// Handle different operations
if (isset($_GET['operation']) || isset($_POST['operation'])) {
    $operation = isset($_GET['operation']) ? $_GET['operation'] : $_POST['operation'];
    
    // Check if user is authenticated (allowing getPaymentTypes without auth)
    $authRequired = ($operation != 'getPaymentTypes');
    $authUser = null;
    
    if ($authRequired) {
        // Try session auth first
        if (function_exists('isAuthenticated') && isAuthenticated()) {
            $authUser = getCurrentUser();
        } else {
            // Try custom header auth
            $authUser = checkCustomAuth();
            
            if (!$authUser) {
                $response['status'] = 'error';
                $response['message'] = 'Authentication required';
                echo json_encode($response);
                exit();
            }
        }
    }
    
    switch ($operation) {
        case 'getPaymentsByParent':
            getPaymentsByParent($pdo, $authUser);
            break;
            
        case 'getPaymentTypes':
            getPaymentTypes($pdo);
            break;
            
        case 'uploadReceipt':
            uploadReceipt($pdo);
            break;
            
        case 'submitPayment':
            submitPayment($pdo);
            break;
            
        case 'approvePayment':
            if ($authUser['role'] !== 'admin') {
                $response['status'] = 'error';
                $response['message'] = 'Only administrators can approve payments';
                echo json_encode($response);
                break;
            }
            approvePayment($pdo);
            break;
            
        case 'rejectPayment':
            if ($authUser['role'] !== 'admin') {
                $response['status'] = 'error';
                $response['message'] = 'Only administrators can reject payments';
                echo json_encode($response);
                break;
            }
            rejectPayment($pdo);
            break;
            
        case 'getAllPayments':
            if ($authUser['role'] !== 'admin') {
                $response['status'] = 'error';
                $response['message'] = 'Only administrators can access all payments';
                echo json_encode($response);
                break;
            }
            getAllPayments($pdo);
            break;
            
        default:
            $response['status'] = 'error';
            $response['message'] = 'Invalid operation';
            echo json_encode($response);
            break;
    }
} else {
    $response['status'] = 'error';
    $response['message'] = 'No operation specified';
    echo json_encode($response);
}

// Function to get payments by parent
function getPaymentsByParent($pdo, $authUser) {
    global $response;
    
    if (!isset($_GET['parent_id'])) {
        $response['status'] = 'error';
        $response['message'] = 'Parent ID is required';
        echo json_encode($response);
        return;
    }
    
    $parentId = $_GET['parent_id'];
    
    // Security check - ensure user can only access their own data
    if ($authUser['role'] !== 'admin' && $authUser['id'] != $parentId) {
        $response['status'] = 'error';
        $response['message'] = 'Access denied';
        echo json_encode($response);
        return;
    }
    
    try {
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
        
        $stmt = $pdo->prepare($query);
        $stmt->execute(['parent_id' => $parentId]);
        
        $payments = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Ensure numeric fields are properly cast as integers
        foreach ($payments as &$payment) {
            if (isset($payment['id'])) {
                $payment['id'] = (int) $payment['id'];
            }
            if (isset($payment['student_id'])) {
                $payment['student_id'] = (int) $payment['student_id'];
            }
            if (isset($payment['payment_type_id'])) {
                $payment['payment_type_id'] = (int) $payment['payment_type_id'];
            }
            if (isset($payment['level_id'])) {
                $payment['level_id'] = (int) $payment['level_id'];
            }
            if (isset($payment['approved_by'])) {
                $payment['approved_by'] = (int) $payment['approved_by'];
            }
        }
        
        $response['status'] = 'success';
        $response['data'] = $payments;
        $response['count'] = count($payments);
    } catch (PDOException $e) {
        $response['status'] = 'error';
        $response['message'] = 'Database error: ' . $e->getMessage();
    }
    
    echo json_encode($response);
}

// Function to get payment types
function getPaymentTypes($pdo) {
    global $response;
    
    try {
        // Query to get payment types
        $query = "SELECT * FROM tbl_payment_types ORDER BY name";
        
        $stmt = $pdo->query($query);
        $paymentTypes = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        $response['status'] = 'success';
        $response['data'] = $paymentTypes;
    } catch (PDOException $e) {
        $response['status'] = 'error';
        $response['message'] = 'Database error: ' . $e->getMessage();
    }
    
    echo json_encode($response);
}

// Function to upload receipt
function uploadReceipt($pdo) {
    global $response;
    
    if (!isset($_FILES['receipt']) || !isset($_POST['student_id'])) {
        $response['status'] = 'error';
        $response['message'] = 'Receipt file and student ID are required';
        echo json_encode($response);
        return;
    }
    
    $studentId = $_POST['student_id'];
    $receiptFile = $_FILES['receipt'];
    
    // Validate file
    $allowedTypes = array('image/jpeg', 'image/png', 'image/gif', 'application/pdf');
    $maxFileSize = 2 * 1024 * 1024; // 2MB
    
    if (!in_array($receiptFile['type'], $allowedTypes)) {
        $response['status'] = 'error';
        $response['message'] = 'Invalid file type. Only JPG, PNG, GIF, and PDF files are allowed.';
        echo json_encode($response);
        return;
    }
    
    if ($receiptFile['size'] > $maxFileSize) {
        $response['status'] = 'error';
        $response['message'] = 'File size exceeds the limit of 2MB.';
        echo json_encode($response);
        return;
    }
    
    // Create upload directory if it doesn't exist
    $uploadDir = '../uploads/receipts/';
    if (!file_exists($uploadDir)) {
        mkdir($uploadDir, 0777, true);
    }
    
    // Generate unique filename
    $filename = 'receipt_' . $studentId . '_' . time() . '_' . $receiptFile['name'];
    $uploadPath = $uploadDir . $filename;
    
    // Move uploaded file
    if (move_uploaded_file($receiptFile['tmp_name'], $uploadPath)) {
        try {
            // Update enrollment record with receipt
            $stmt = $pdo->prepare("UPDATE tbl_enrollments SET payment_receipt = ? WHERE student_id = ? AND payment_status = 'pending'");
            $stmt->execute([$filename, $studentId]);
            
            $response['status'] = 'success';
            $response['message'] = 'Receipt uploaded successfully';
            $response['filename'] = $filename;
        } catch (PDOException $e) {
            $response['status'] = 'error';
            $response['message'] = 'Database error: ' . $e->getMessage();
        }
    } else {
        $response['status'] = 'error';
        $response['message'] = 'Failed to upload receipt';
    }
    
    echo json_encode($response);
}

// Function to submit payment
function submitPayment($pdo) {
    global $response;
    
    // Get JSON data if available
    $jsonData = null;
    if (isset($_POST['json'])) {
        $jsonData = json_decode($_POST['json'], true);
    }
    
    // Retrieve data from either JSON or direct form fields
    $studentId = $jsonData['student_id'] ?? $_POST['student_id'] ?? null;
    $paymentTypeId = $jsonData['payment_type_id'] ?? $_POST['payment_type_id'] ?? null;
    $amount = $jsonData['amount'] ?? $_POST['amount'] ?? null;
    $paymentMethod = $jsonData['payment_method'] ?? $_POST['payment_method'] ?? null;
    $referenceNumber = $jsonData['reference_number'] ?? $_POST['reference_number'] ?? null;
    $notes = $jsonData['notes'] ?? $_POST['notes'] ?? null;
    $receiptFilename = $jsonData['receipt_filename'] ?? $_POST['receipt_filename'] ?? null;
    
    // Debug information
    error_log("Payment submission received - Student ID: $studentId, Type: $paymentTypeId, Amount: $amount, Method: $paymentMethod");
    
    // Validate required fields
    $errors = [];
    if (!$studentId) $errors[] = "Student ID";
    if (!$paymentTypeId) $errors[] = "Payment Type";
    if (!$amount) $errors[] = "Amount";
    if (!$paymentMethod) $errors[] = "Payment Method";
    
    if (!empty($errors)) {
        $response['status'] = 'error';
        $response['message'] = 'Missing required fields: ' . implode(', ', $errors);
        echo json_encode($response);
        return;
    }
    
    // Additional validation - if payment method is not Cash, reference number should be provided
    if ($paymentMethod !== 'Cash' && empty($referenceNumber)) {
        $response['status'] = 'error';
        $response['message'] = 'Reference number is required for ' . $paymentMethod . ' payments';
        echo json_encode($response);
        return;
    }
    
    // Check if receipt file was uploaded in this request
    $receiptUploadedNow = false;
    if (isset($_FILES['receipt']) && $_FILES['receipt']['error'] == 0) {
        $receiptFile = $_FILES['receipt'];
        
        // Validate file
        $allowedTypes = array('image/jpeg', 'image/png', 'image/gif', 'application/pdf');
        $maxFileSize = 2 * 1024 * 1024; // 2MB
        
        if (!in_array($receiptFile['type'], $allowedTypes) || $receiptFile['size'] > $maxFileSize) {
            $response['status'] = 'error';
            $response['message'] = 'Invalid receipt file. Please upload a valid JPG, PNG, GIF, or PDF file (max 2MB).';
            echo json_encode($response);
            return;
        }
        
        // Create upload directory if it doesn't exist
        $uploadDir = '../uploads/receipts/';
        if (!file_exists($uploadDir)) {
            mkdir($uploadDir, 0777, true);
        }
        
        // Generate unique filename
        $receiptFilename = 'receipt_' . $studentId . '_' . time() . '_' . basename($receiptFile['name']);
        $uploadPath = $uploadDir . $receiptFilename;
        
        // Move uploaded file
        if (!move_uploaded_file($receiptFile['tmp_name'], $uploadPath)) {
            $response['status'] = 'error';
            $response['message'] = 'Failed to upload receipt file.';
            echo json_encode($response);
            return;
        }
        
        $receiptUploadedNow = true;
    }
    
    try {
        $pdo->beginTransaction();
        
        // Always create a new payment record instead of updating existing ones
        $stmt = $pdo->prepare("INSERT INTO tbl_enrollments (
            student_id, 
            enrollment_date, 
            payment_status, 
            payment_date, 
            payment_amount, 
            payment_method, 
            payment_reference, 
            payment_type_id,
            payment_receipt,
            notes,
            created_at
        ) VALUES (?, CURDATE(), 'pending_approval', NOW(), ?, ?, ?, ?, ?, ?, NOW())");
        
        $stmt->execute([
            $studentId,
            $amount,
            $paymentMethod,
            $referenceNumber,
            $paymentTypeId,
            $receiptFilename,
            $notes
        ]);
        
        $enrollmentId = $pdo->lastInsertId();
        
        // Also check if the student's enrollment status should be updated (if this is their first payment)
        $stmt = $pdo->prepare("SELECT COUNT(*) FROM tbl_enrollments WHERE student_id = ?");
        $stmt->execute([$studentId]);
        $paymentCount = $stmt->fetchColumn();
        
        if ($paymentCount == 1) {
            // This is the first payment, update student enrollment status if needed
            $stmt = $pdo->prepare("UPDATE tbl_students SET 
                enrollment_status = CASE WHEN enrollment_status = '' THEN 'pending' ELSE enrollment_status END 
                WHERE id = ?");
            $stmt->execute([$studentId]);
        }
        
        $pdo->commit();
        
        $response['status'] = 'success';
        $response['message'] = 'Payment submitted successfully';
        $response['enrollment_id'] = $enrollmentId;
    } catch (PDOException $e) {
        $pdo->rollBack();
        $response['status'] = 'error';
        $response['message'] = 'Database error: ' . $e->getMessage();
        error_log("Payment submission error: " . $e->getMessage());
    }
    
    echo json_encode($response);
}

// Function to approve payment
function approvePayment($pdo) {
    global $response;
    
    // Get payment ID from POST data
    if (!isset($_POST['payment_id'])) {
        $response['status'] = 'error';
        $response['message'] = 'Payment ID is required';
        echo json_encode($response);
        return;
    }
    
    $paymentId = $_POST['payment_id'];
    
    try {
        $pdo->beginTransaction();
        
        // Update enrollment record payment status
        $stmt = $pdo->prepare("UPDATE tbl_enrollments SET 
            payment_status = 'paid',
            approved_by = ?,
            status_update_date = NOW()
            WHERE id = ?");
            
        $stmt->execute([
            $_SERVER['HTTP_X_AUTH_USER'],
            $paymentId
        ]);
        
        // Get the student_id for this payment
        $stmt = $pdo->prepare("SELECT student_id FROM tbl_enrollments WHERE id = ?");
        $stmt->execute([$paymentId]);
        $studentId = $stmt->fetchColumn();
        
        if ($studentId) {
            // Update student enrollment status if not already enrolled
            $stmt = $pdo->prepare("UPDATE tbl_students SET 
                enrollment_status = 'enrolled' 
                WHERE id = ? AND enrollment_status = 'pending'");
            $stmt->execute([$studentId]);
        }
        
        $pdo->commit();
        
        $response['status'] = 'success';
        $response['message'] = 'Payment approved successfully';
    } catch (PDOException $e) {
        $pdo->rollBack();
        $response['status'] = 'error';
        $response['message'] = 'Database error: ' . $e->getMessage();
    }
    
    echo json_encode($response);
}

// Function to reject payment
function rejectPayment($pdo) {
    global $response;
    
    // Get payment ID and reason from POST data
    if (!isset($_POST['payment_id']) || !isset($_POST['reason'])) {
        $response['status'] = 'error';
        $response['message'] = 'Payment ID and rejection reason are required';
        echo json_encode($response);
        return;
    }
    
    $paymentId = $_POST['payment_id'];
    $reason = $_POST['reason'];
    
    try {
        $pdo->beginTransaction();
        
        // Update enrollment record payment status
        $stmt = $pdo->prepare("UPDATE tbl_enrollments SET 
            payment_status = 'rejected',
            notes = ?,
            approved_by = ?,
            status_update_date = NOW()
            WHERE id = ?");
            
        $stmt->execute([
            $reason,
            $_SERVER['HTTP_X_AUTH_USER'],
            $paymentId
        ]);
        
        $pdo->commit();
        
        $response['status'] = 'success';
        $response['message'] = 'Payment rejected successfully';
    } catch (PDOException $e) {
        $pdo->rollBack();
        $response['status'] = 'error';
        $response['message'] = 'Database error: ' . $e->getMessage();
    }
    
    echo json_encode($response);
}

// Function to get all payments (for admin)
function getAllPayments($pdo) {
    global $response;
    
    try {
        // Comprehensive query to get all payments with related information
        $query = "SELECT e.*, 
                    pt.name as payment_type_name,
                    s.name as student_name,
                    s.parent_id,
                    u.name as parent_name
                  FROM tbl_enrollments e
                  JOIN tbl_students s ON e.student_id = s.id
                  LEFT JOIN tbl_users u ON s.parent_id = u.id
                  LEFT JOIN tbl_payment_types pt ON e.payment_type_id = pt.id
                  WHERE e.payment_date IS NOT NULL
                  ORDER BY e.payment_date DESC";
        
        $stmt = $pdo->query($query);
        $payments = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Ensure numeric fields are properly formatted
        foreach ($payments as &$payment) {
            if (isset($payment['id'])) {
                $payment['id'] = (int) $payment['id'];
            }
            if (isset($payment['student_id'])) {
                $payment['student_id'] = (int) $payment['student_id'];
            }
            if (isset($payment['parent_id'])) {
                $payment['parent_id'] = (int) $payment['parent_id'];
            }
            if (isset($payment['payment_type_id'])) {
                $payment['payment_type_id'] = (int) $payment['payment_type_id'];
            }
            if (isset($payment['approved_by'])) {
                $payment['approved_by'] = (int) $payment['approved_by'];
            }
        }
        
        $response['status'] = 'success';
        $response['data'] = $payments;
        $response['count'] = count($payments);
    } catch (PDOException $e) {
        $response['status'] = 'error';
        $response['message'] = 'Database error: ' . $e->getMessage();
    }
    
    echo json_encode($response);
}
?> 