<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

require_once 'connection.php';

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

class Level {
    private $conn;

    public function __construct($conn) {
        $this->conn = $conn;
    }

    public function getAllLevels() {
        try {
            $query = "SELECT * FROM tbl_levels ORDER BY name";
            $result = mysqli_query($this->conn, $query);

            if (!$result) {
                throw new Exception(mysqli_error($this->conn));
            }

            $levels = array();
            while ($row = mysqli_fetch_assoc($result)) {
                $levels[] = $row;
            }

            return array(
                'status' => 'success',
                'data' => $levels
            );
        } catch (Exception $e) {
            return array(
                'status' => 'error',
                'message' => $e->getMessage()
            );
        }
    }

    public function getLevelById($id) {
        try {
            $query = "SELECT * FROM tbl_levels WHERE id = ?";
            $stmt = mysqli_prepare($this->conn, $query);
            mysqli_stmt_bind_param($stmt, "i", $id);
            mysqli_stmt_execute($stmt);
            $result = mysqli_stmt_get_result($stmt);

            if (!$result) {
                throw new Exception(mysqli_error($this->conn));
            }

            $level = mysqli_fetch_assoc($result);

            if (!$level) {
                return array(
                    'status' => 'error',
                    'message' => 'Level not found'
                );
            }

            return array(
                'status' => 'success',
                'data' => $level
            );
        } catch (Exception $e) {
            return array(
                'status' => 'error',
                'message' => $e->getMessage()
            );
        }
    }

    public function addLevel($json) {
        try {
            $data = json_decode($json, true);

            if (!isset($data['name']) || empty($data['name'])) {
                return array(
                    'status' => 'error',
                    'message' => 'Level name is required'
                );
            }

            // Check if level name already exists
            $query = "SELECT id FROM tbl_levels WHERE name = ?";
            $stmt = mysqli_prepare($this->conn, $query);
            mysqli_stmt_bind_param($stmt, "s", $data['name']);
            mysqli_stmt_execute($stmt);
            $result = mysqli_stmt_get_result($stmt);

            if (mysqli_num_rows($result) > 0) {
                return array(
                    'status' => 'error',
                    'message' => 'Level name already exists'
                );
            }

            // Insert new level
            $query = "INSERT INTO tbl_levels (name, description, status) VALUES (?, ?, ?)";
            $stmt = mysqli_prepare($this->conn, $query);
            $description = isset($data['description']) ? $data['description'] : '';
            $status = isset($data['status']) ? $data['status'] : 'active';
            mysqli_stmt_bind_param($stmt, "sss", $data['name'], $description, $status);

            if (!mysqli_stmt_execute($stmt)) {
                throw new Exception(mysqli_error($this->conn));
            }

            $levelId = mysqli_insert_id($this->conn);

            return array(
                'status' => 'success',
                'message' => 'Level added successfully',
                'data' => array('id' => $levelId)
            );
        } catch (Exception $e) {
            return array(
                'status' => 'error',
                'message' => $e->getMessage()
            );
        }
    }

    public function updateLevel($json) {
        try {
            $data = json_decode($json, true);

            if (!isset($data['id']) || !isset($data['name']) || empty($data['name'])) {
                return array(
                    'status' => 'error',
                    'message' => 'Level ID and name are required'
                );
            }

            // Check if level exists
            $query = "SELECT id FROM tbl_levels WHERE id = ?";
            $stmt = mysqli_prepare($this->conn, $query);
            mysqli_stmt_bind_param($stmt, "i", $data['id']);
            mysqli_stmt_execute($stmt);
            $result = mysqli_stmt_get_result($stmt);

            if (mysqli_num_rows($result) === 0) {
                return array(
                    'status' => 'error',
                    'message' => 'Level not found'
                );
            }

            // Check if level name already exists (excluding current level)
            $query = "SELECT id FROM tbl_levels WHERE name = ? AND id != ?";
            $stmt = mysqli_prepare($this->conn, $query);
            mysqli_stmt_bind_param($stmt, "si", $data['name'], $data['id']);
            mysqli_stmt_execute($stmt);
            $result = mysqli_stmt_get_result($stmt);

            if (mysqli_num_rows($result) > 0) {
                return array(
                    'status' => 'error',
                    'message' => 'Level name already exists'
                );
            }

            // Update level
            $query = "UPDATE tbl_levels SET name = ?, description = ?, status = ? WHERE id = ?";
            $stmt = mysqli_prepare($this->conn, $query);
            $description = isset($data['description']) ? $data['description'] : '';
            $status = isset($data['status']) ? $data['status'] : 'active';
            mysqli_stmt_bind_param($stmt, "sssi", $data['name'], $description, $status, $data['id']);

            if (!mysqli_stmt_execute($stmt)) {
                throw new Exception(mysqli_error($this->conn));
            }

            return array(
                'status' => 'success',
                'message' => 'Level updated successfully'
            );
        } catch (Exception $e) {
            return array(
                'status' => 'error',
                'message' => $e->getMessage()
            );
        }
    }

    public function deleteLevel($id) {
        try {
            // Check if level exists
            $query = "SELECT id FROM tbl_levels WHERE id = ?";
            $stmt = mysqli_prepare($this->conn, $query);
            mysqli_stmt_bind_param($stmt, "i", $id);
            mysqli_stmt_execute($stmt);
            $result = mysqli_stmt_get_result($stmt);

            if (mysqli_num_rows($result) === 0) {
                return array(
                    'status' => 'error',
                    'message' => 'Level not found'
                );
            }

            // Check if level has sections
            $query = "SELECT id FROM tbl_sections WHERE level_id = ?";
            $stmt = mysqli_prepare($this->conn, $query);
            mysqli_stmt_bind_param($stmt, "i", $id);
            mysqli_stmt_execute($stmt);
            $result = mysqli_stmt_get_result($stmt);

            if (mysqli_num_rows($result) > 0) {
                return array(
                    'status' => 'error',
                    'message' => 'Cannot delete level with existing sections'
                );
            }

            // Delete level
            $query = "DELETE FROM tbl_levels WHERE id = ?";
            $stmt = mysqli_prepare($this->conn, $query);
            mysqli_stmt_bind_param($stmt, "i", $id);

            if (!mysqli_stmt_execute($stmt)) {
                throw new Exception(mysqli_error($this->conn));
            }

            return array(
                'status' => 'success',
                'message' => 'Level deleted successfully'
            );
        } catch (Exception $e) {
            return array(
                'status' => 'error',
                'message' => $e->getMessage()
            );
        }
    }
}

// Handle API requests
$level = new Level($conn);

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $action = $_GET['action'] ?? '';

    switch ($action) {
        case 'getAllLevels':
            echo json_encode($level->getAllLevels());
            break;
        case 'getLevelById':
            $id = $_GET['id'] ?? 0;
            echo json_encode($level->getLevelById($id));
            break;
        default:
            echo json_encode(array(
                'status' => 'error',
                'message' => 'Invalid action'
            ));
    }
} else if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $action = $_GET['action'] ?? '';
    $json = file_get_contents('php://input');

    switch ($action) {
        case 'addLevel':
            echo json_encode($level->addLevel($json));
            break;
        case 'updateLevel':
            echo json_encode($level->updateLevel($json));
            break;
        case 'deleteLevel':
            $data = json_decode($json, true);
            $id = $data['id'] ?? 0;
            echo json_encode($level->deleteLevel($id));
            break;
        default:
            echo json_encode(array(
                'status' => 'error',
                'message' => 'Invalid action'
            ));
    }
} else {
    echo json_encode(array(
        'status' => 'error',
        'message' => 'Invalid request method'
    ));
} 