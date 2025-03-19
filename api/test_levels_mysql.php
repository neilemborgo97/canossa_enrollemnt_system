<?php
header('Content-Type: application/json');

// Include the mysqli connection
include "connection.php";

// Query for grade levels
$query = "SELECT * FROM tbl_kindergarten_levels";
$result = mysqli_query($conn, $query);

if (!$result) {
    echo json_encode([
        'status' => 'error',
        'message' => 'Query failed: ' . mysqli_error($conn)
    ]);
    exit;
}

// Fetch and format data
$levels = [];
while ($row = mysqli_fetch_assoc($result)) {
    $levels[] = [
        'id' => (int)$row['id'],
        'level_name' => $row['level_name']
    ];
}

// Return the results
echo json_encode([
    'status' => 'success',
    'data' => $levels,
    'count' => count($levels)
]);
?> 