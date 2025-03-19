<?php
// Database configuration
$host = 'localhost';
$username = 'root';
$password = '';
$database = 'canossa_enrollment';

// Create connection
$conn = mysqli_connect($host, $username, $password, $database);

// Check connection
if (!$conn) {
    die(json_encode([
        'status' => 'error',
        'message' => 'Connection failed: ' . mysqli_connect_error()
    ]));
}

// Set charset to utf8mb4
mysqli_set_charset($conn, 'utf8mb4');
?> 