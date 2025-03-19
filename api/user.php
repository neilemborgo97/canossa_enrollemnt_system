<?php
header('Content-Type: application/json');
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

// Include connection files
include_once "connection.php";
include_once "connection-pdo.php";

// Add this temporarily at the top of the file after the headers
if (isset($_GET['test'])) {
    include "connection-pdo.php";
    $stmt = $pdo->query("SELECT * FROM users");
    echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
    exit;
}

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    exit(0);
}

class User {
    // Login function
    function login($json) {
        include "connection-pdo.php";
        $data = json_decode($json);
        
        // Validate input
        if (!isset($data->email) || !isset($data->password)) {
            return json_encode([
                'status' => 'error',
                'message' => 'Email and password are required'
            ]);
        }
        
        try {
            $stmt = $pdo->prepare("SELECT id, name, email, password, role FROM tbl_users WHERE email = ?");
            $stmt->execute([$data->email]);
            $user = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if ($user) {
                // Check if password is already hashed (starts with $2y$)
                $passwordMatch = false;
                
                if (strpos($user['password'], '$2y$') === 0) {
                    // Password is hashed, use password_verify
                    $passwordMatch = password_verify($data->password, $user['password']);
                } else {
                    // Password is plain text (for admin account), direct comparison
                    $passwordMatch = ($data->password === $user['password']);
                }
                
                if ($passwordMatch) {
                    // Remove password from returned data
                    unset($user['password']);
                    
                    return json_encode([
                        'status' => 'success',
                        'message' => 'Login successful',
                        'data' => $user
                    ]);
                }
            }
            
            return json_encode([
                'status' => 'error',
                'message' => 'Invalid email or password'
            ]);
        } catch(PDOException $e) {
            return json_encode([
                'status' => 'error',
                'message' => 'Database error: ' . $e->getMessage()
            ]);
        }
    }

    // Get all users
    function getAllUsers() {
        include "connection-pdo.php";
        
        try {
            $stmt = $pdo->prepare("SELECT id, name, email, role, created_at FROM tbl_users ORDER BY name ASC");
            $stmt->execute();
            $users = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            return json_encode([
                'status' => 'success',
                'message' => 'Users retrieved successfully',
                'data' => $users
            ]);
        } catch(PDOException $e) {
            return json_encode([
                'status' => 'error',
                'message' => 'Database error: ' . $e->getMessage()
            ]);
        }
    }
    
    // Get user by ID
    function getUserById($id) {
        include "connection-pdo.php";
        
        try {
            $stmt = $pdo->prepare("SELECT id, name, email, role, created_at FROM tbl_users WHERE id = ?");
            $stmt->execute([$id]);
            $user = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if ($user) {
                return json_encode([
                    'status' => 'success',
                    'message' => 'User retrieved successfully',
                    'data' => $user
                ]);
            } else {
                return json_encode([
                    'status' => 'error',
                    'message' => 'User not found'
                ]);
            }
        } catch(PDOException $e) {
            return json_encode([
                'status' => 'error',
                'message' => 'Database error: ' . $e->getMessage()
            ]);
        }
    }
    
    // Add new user
    function addUser($json) {
        include "connection-pdo.php";
        $data = json_decode($json);
        
        // Validate input
        if (!isset($data->name) || !isset($data->email) || !isset($data->password) || !isset($data->role)) {
            return json_encode([
                'status' => 'error',
                'message' => 'Name, email, password and role are required'
            ]);
        }
        
        try {
            // Check if email already exists
            $stmt = $pdo->prepare("SELECT id FROM tbl_users WHERE email = ?");
            $stmt->execute([$data->email]);
            if ($stmt->fetch()) {
                return json_encode([
                    'status' => 'error',
                    'message' => 'Email already exists'
                ]);
            }
            
            // Hash password
            $hashedPassword = password_hash($data->password, PASSWORD_DEFAULT);
            
            $stmt = $pdo->prepare("INSERT INTO tbl_users (name, email, password, role) VALUES (?, ?, ?, ?)");
            
            $stmt->execute([
                $data->name,
                $data->email,
                $hashedPassword,
                $data->role
            ]);
            
            $userId = $pdo->lastInsertId();
            
            return json_encode([
                'status' => 'success',
                'message' => 'User added successfully',
                'data' => ['id' => $userId]
            ]);
        } catch(PDOException $e) {
            return json_encode([
                'status' => 'error',
                'message' => 'Database error: ' . $e->getMessage()
            ]);
        }
    }
    
    // Update user
    function updateUser($json) {
        include "connection-pdo.php";
        $data = json_decode($json);
        
        // Validate input
        if (!isset($data->id) || !isset($data->name) || !isset($data->email) || !isset($data->role)) {
            return json_encode([
                'status' => 'error',
                'message' => 'ID, name, email and role are required'
            ]);
        }
        
        try {
            // Check if email already exists for another user
            $stmt = $pdo->prepare("SELECT id FROM tbl_users WHERE email = ? AND id != ?");
            $stmt->execute([$data->email, $data->id]);
            if ($stmt->fetch()) {
                return json_encode([
                    'status' => 'error',
                    'message' => 'Email already exists for another user'
                ]);
            }
            
            // Prepare update query
            $updateFields = ["name = ?", "email = ?", "role = ?"];
            $params = [$data->name, $data->email, $data->role];
            
            // Add password to update if provided
            if (isset($data->password) && !empty($data->password)) {
                $updateFields[] = "password = ?";
                $params[] = password_hash($data->password, PASSWORD_DEFAULT);
            }
            
            $params[] = $data->id;
            
            $stmt = $pdo->prepare("UPDATE tbl_users SET " . implode(", ", $updateFields) . " WHERE id = ?");
            
            $result = $stmt->execute($params);
            
            if ($result) {
                return json_encode([
                    'status' => 'success',
                    'message' => 'User updated successfully'
                ]);
            } else {
                return json_encode([
                    'status' => 'error',
                    'message' => 'No changes made or user not found'
                ]);
            }
        } catch(PDOException $e) {
            return json_encode([
                'status' => 'error',
                'message' => 'Database error: ' . $e->getMessage()
            ]);
        }
    }
    
    // Delete user
    function deleteUser($id) {
        include "connection-pdo.php";
        
        try {
            // Check if user is an admin
            $stmt = $pdo->prepare("SELECT role FROM tbl_users WHERE id = ?");
            $stmt->execute([$id]);
            $user = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if ($user && $user['role'] === 'admin') {
                return json_encode([
                    'status' => 'error',
                    'message' => 'Cannot delete admin user'
                ]);
            }
            
            // Check if user has students
            $stmt = $pdo->prepare("SELECT id FROM tbl_students WHERE parent_id = ?");
            $stmt->execute([$id]);
            if ($stmt->fetch()) {
                return json_encode([
                    'status' => 'error',
                    'message' => 'Cannot delete user. User has enrolled students.'
                ]);
            }
            
            $stmt = $pdo->prepare("DELETE FROM tbl_users WHERE id = ?");
            $stmt->execute([$id]);
            
            if ($stmt->rowCount() > 0) {
                return json_encode([
                    'status' => 'success',
                    'message' => 'User deleted successfully'
                ]);
            } else {
                return json_encode([
                    'status' => 'error',
                    'message' => 'User not found'
                ]);
            }
        } catch(PDOException $e) {
            return json_encode([
                'status' => 'error',
                'message' => 'Database error: ' . $e->getMessage()
            ]);
        }
    }
    
    // Register function (for parents)
    function register($json) {
        include "connection-pdo.php";
        $data = json_decode($json);
        
        // Validate input
        if (!isset($data->name) || !isset($data->email) || !isset($data->password)) {
            return json_encode([
                'status' => 'error',
                'message' => 'Name, email, and password are required'
            ]);
        }
        
        try {
            // Check if email already exists
            $stmt = $pdo->prepare("SELECT id FROM tbl_users WHERE email = ?");
            $stmt->execute([$data->email]);
            if ($stmt->fetch()) {
                return json_encode([
                    'status' => 'error',
                    'message' => 'Email already exists'
                ]);
            }
            
            // Hash password
            $hashedPassword = password_hash($data->password, PASSWORD_DEFAULT);
            
            $stmt = $pdo->prepare("INSERT INTO tbl_users (name, email, password, role) VALUES (?, ?, ?, 'parent')");
            
            $stmt->execute([
                $data->name,
                $data->email,
                $hashedPassword
            ]);
            
            $userId = $pdo->lastInsertId();
            
            return json_encode([
                'status' => 'success',
                'message' => 'Registration successful! You can now login.',
                'data' => ['id' => $userId]
            ]);
        } catch(PDOException $e) {
            return json_encode([
                'status' => 'error',
                'message' => 'Database error: ' . $e->getMessage()
            ]);
        }
    }
}

// Handle API requests
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $user = new User();
    
    if (isset($_POST['operation'])) {
        $operation = $_POST['operation'];
        
        switch ($operation) {
            case 'login':
                if (isset($_POST['json'])) {
                    echo $user->login($_POST['json']);
                } else {
                    echo json_encode(['status' => 'error', 'message' => 'No data provided']);
                }
                break;
                
            case 'register':
                if (isset($_POST['json'])) {
                    echo $user->register($_POST['json']);
                } else {
                    echo json_encode(['status' => 'error', 'message' => 'No data provided']);
                }
                break;
                
            case 'getAllUsers':
                echo $user->getAllUsers();
                break;
            
            case 'getUserById':
                if (isset($_POST['id'])) {
                    echo $user->getUserById($_POST['id']);
                } else {
                    echo json_encode(['status' => 'error', 'message' => 'User ID required']);
                }
                break;
            
            case 'addUser':
                if (isset($_POST['json'])) {
                    echo $user->addUser($_POST['json']);
                } else {
                    echo json_encode(['status' => 'error', 'message' => 'No data provided']);
                }
                break;
            
            case 'updateUser':
                if (isset($_POST['json'])) {
                    echo $user->updateUser($_POST['json']);
                } else {
                    echo json_encode(['status' => 'error', 'message' => 'No data provided']);
                }
                break;
            
            case 'deleteUser':
                if (isset($_POST['id'])) {
                    echo $user->deleteUser($_POST['id']);
                } else {
                    echo json_encode(['status' => 'error', 'message' => 'User ID required']);
                }
                break;
            
            default:
                echo json_encode(['status' => 'error', 'message' => 'Invalid operation']);
        }
    } else {
        echo json_encode(['status' => 'error', 'message' => 'No operation specified']);
    }
}
?> 