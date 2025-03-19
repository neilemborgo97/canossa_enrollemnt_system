<?php
// Start session if not already started
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

/**
 * Check if user is authenticated
 * @return bool True if authenticated, false otherwise
 */
function isAuthenticated() {
    return isset($_SESSION['user_id']) && !empty($_SESSION['user_id']);
}

/**
 * Get current authenticated user
 * @return array|null User data or null if not authenticated
 */
function getCurrentUser() {
    if (isAuthenticated()) {
        return [
            'id' => $_SESSION['user_id'],
            'name' => $_SESSION['user_name'] ?? 'User',
            'role' => $_SESSION['user_role'] ?? 'parent',
            'email' => $_SESSION['user_email'] ?? ''
        ];
    }
    
    return null;
}

/**
 * Check if user has admin role
 * @return bool True if user is admin, false otherwise
 */
function isAdmin() {
    return isAuthenticated() && isset($_SESSION['user_role']) && $_SESSION['user_role'] === 'admin';
}
?> 