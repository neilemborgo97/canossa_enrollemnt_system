-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Mar 19, 2025 at 04:45 PM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `canossa_enrollment`
--

-- --------------------------------------------------------

--
-- Table structure for table `tbl_emergency_contacts`
--

CREATE TABLE `tbl_emergency_contacts` (
  `id` int(11) NOT NULL,
  `student_id` int(11) NOT NULL,
  `guardian_name` varchar(100) NOT NULL,
  `relationship` varchar(50) NOT NULL,
  `contact_number` varchar(20) NOT NULL,
  `email` varchar(100) NOT NULL,
  `emergency_contact_name` varchar(100) NOT NULL,
  `emergency_contact_number` varchar(20) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tbl_emergency_contacts`
--

INSERT INTO `tbl_emergency_contacts` (`id`, `student_id`, `guardian_name`, `relationship`, `contact_number`, `email`, `emergency_contact_name`, `emergency_contact_number`) VALUES
(1, 1, 'Ma. Nellie Emborgo', 'Mother', '09561234824', 'nellie@gmail.com', 'Ma. Nellie Emborgo', '09561234824'),
(2, 2, 'Ma. Nellie Emborgo', 'Mother', '09561234824', 'nellie@gmail.com', 'Ma. Nellie Emborgo', '09561234824'),
(3, 3, 'Chanlee Lagnason Sr.', 'Father', '09123456789', 'chanlee@gmail.com', 'Chanlee Lagnason Sr.', '09123456789');

-- --------------------------------------------------------

--
-- Table structure for table `tbl_enrollments`
--

CREATE TABLE `tbl_enrollments` (
  `id` int(11) NOT NULL,
  `student_id` int(11) NOT NULL,
  `enrollment_date` date NOT NULL,
  `status` varchar(20) DEFAULT NULL,
  `approved_by` int(11) DEFAULT NULL,
  `status_update_date` timestamp NULL DEFAULT NULL,
  `payment_status` enum('pending','pending_approval','paid','rejected') DEFAULT 'pending',
  `payment_date` datetime DEFAULT NULL,
  `payment_amount` decimal(10,2) DEFAULT NULL,
  `payment_method` varchar(50) DEFAULT NULL,
  `payment_reference` varchar(100) DEFAULT NULL,
  `payment_receipt` varchar(255) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `payment_type_id` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tbl_enrollments`
--

INSERT INTO `tbl_enrollments` (`id`, `student_id`, `enrollment_date`, `status`, `approved_by`, `status_update_date`, `payment_status`, `payment_date`, `payment_amount`, `payment_method`, `payment_reference`, `payment_receipt`, `notes`, `created_at`, `payment_type_id`) VALUES
(1, 1, '2025-03-19', 'enrolled', 1, '2025-03-19 11:09:36', 'pending_approval', '2025-03-19 19:22:51', 5000.00, 'GCash', 'asdasdas', 'receipt_1_1742383371_PSA.jpg', 'asasd', '2025-03-19 04:10:11', 1),
(2, 2, '2025-03-19', NULL, 1, '2025-03-19 11:09:32', 'paid', '2025-03-19 19:01:03', 20000.00, 'GCash', '123123123', 'receipt_2_1742382063_sample gcash.jpg', NULL, '2025-03-19 06:11:45', 2),
(3, 3, '2025-03-19', NULL, 1, '2025-03-19 11:09:40', 'paid', NULL, NULL, NULL, NULL, 'receipt_3_1742372561_sample gcash.jpg', NULL, '2025-03-19 08:21:04', NULL),
(4, 1, '2025-03-19', NULL, NULL, NULL, 'pending_approval', '2025-03-19 19:27:05', 1000.00, 'Test', 'TEST123', NULL, 'Test payment', '2025-03-19 11:27:05', 1),
(5, 1, '2025-03-19', NULL, NULL, NULL, 'pending_approval', '2025-03-19 19:27:17', 1000.00, 'Test', 'TEST123', NULL, 'Test payment', '2025-03-19 11:27:17', 1);

-- --------------------------------------------------------

--
-- Table structure for table `tbl_kindergarten_levels`
--

CREATE TABLE `tbl_kindergarten_levels` (
  `id` int(11) NOT NULL,
  `level_name` varchar(50) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tbl_kindergarten_levels`
--

INSERT INTO `tbl_kindergarten_levels` (`id`, `level_name`) VALUES
(1, 'Nursery'),
(2, 'Pre-Kindergarten'),
(3, 'Kindergarten 1'),
(4, 'Kindergarten 2');

-- --------------------------------------------------------

--
-- Table structure for table `tbl_levels`
--

CREATE TABLE `tbl_levels` (
  `id` int(11) NOT NULL,
  `name` varchar(50) NOT NULL,
  `description` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tbl_levels`
--

INSERT INTO `tbl_levels` (`id`, `name`, `description`, `created_at`) VALUES
(1, 'Nursery', 'For children aged 2-3 years', '2025-03-19 13:20:34'),
(2, 'Kindergarten 1', 'For children aged 3-4 years', '2025-03-19 13:20:34'),
(3, 'Kindergarten 2', 'For children aged 4-5 years', '2025-03-19 13:20:34'),
(4, 'Kindergarten 3', 'For children aged 5-6 years', '2025-03-19 13:20:34');

-- --------------------------------------------------------

--
-- Table structure for table `tbl_payment_types`
--

CREATE TABLE `tbl_payment_types` (
  `id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `description` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tbl_payment_types`
--

INSERT INTO `tbl_payment_types` (`id`, `name`, `amount`, `description`, `created_at`) VALUES
(1, 'Enrollment Fee', 5000.00, 'One-time enrollment fee', '2025-03-19 03:55:01'),
(2, 'Tuition Fee', 20000.00, 'Annual tuition fee', '2025-03-19 03:55:01'),
(3, 'Miscellaneous Fee', 3000.00, 'Covers books, materials, and activities', '2025-03-19 03:55:01');

-- --------------------------------------------------------

--
-- Table structure for table `tbl_receipts`
--

CREATE TABLE `tbl_receipts` (
  `id` int(11) NOT NULL,
  `enrollment_id` int(11) NOT NULL,
  `receipt_number` varchar(20) NOT NULL,
  `date_issued` date NOT NULL,
  `payment_mode` varchar(50) DEFAULT NULL,
  `amount_paid` decimal(10,2) DEFAULT NULL,
  `remaining_balance` decimal(10,2) DEFAULT NULL,
  `next_due_date` date DEFAULT NULL,
  `received_by` varchar(100) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `tbl_required_documents`
--

CREATE TABLE `tbl_required_documents` (
  `id` int(11) NOT NULL,
  `student_id` int(11) NOT NULL,
  `birth_certificate_file` varchar(255) DEFAULT NULL,
  `birth_certificate_status` tinyint(1) DEFAULT 0,
  `id_picture_file` varchar(255) DEFAULT NULL,
  `id_picture_status` tinyint(1) DEFAULT 0,
  `medical_certificate_file` varchar(255) DEFAULT NULL,
  `medical_certificate_status` tinyint(1) DEFAULT 0,
  `report_card_file` varchar(255) DEFAULT NULL,
  `report_card_status` tinyint(1) DEFAULT 0,
  `submitted_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tbl_required_documents`
--

INSERT INTO `tbl_required_documents` (`id`, `student_id`, `birth_certificate_file`, `birth_certificate_status`, `id_picture_file`, `id_picture_status`, `medical_certificate_file`, `medical_certificate_status`, `report_card_file`, `report_card_status`, `submitted_at`, `updated_at`) VALUES
(1, 1, '1_birth_certificate_1742357485.jpg', 1, '1_id_picture_1742357521.jpg', 1, '1_medical_certificate_1742357552.webp', 1, NULL, 0, '2025-03-19 04:10:11', '2025-03-19 04:12:32'),
(2, 2, '2_birth_certificate_1742364761.jpg', 1, '2_id_picture_1742364727.jpg', 1, '2_medical_certificate_1742364745.webp', 1, NULL, 0, '2025-03-19 06:11:45', '2025-03-19 06:12:41'),
(3, 3, '3_birth_certificate_1742372519.jpg', 1, '3_id_picture_1742372516.jpg', 1, '3_medical_certificate_1742372506.webp', 1, NULL, 0, '2025-03-19 08:21:04', '2025-03-19 08:21:59');

-- --------------------------------------------------------

--
-- Table structure for table `tbl_sections`
--

CREATE TABLE `tbl_sections` (
  `id` int(128) NOT NULL,
  `section_name` varchar(128) NOT NULL,
  `level_id` int(128) NOT NULL,
  `teacher_id` int(128) NOT NULL,
  `schedule` varchar(128) NOT NULL,
  `max_capacity` int(128) NOT NULL,
  `description` varchar(128) DEFAULT NULL,
  `status` text NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tbl_sections`
--

INSERT INTO `tbl_sections` (`id`, `section_name`, `level_id`, `teacher_id`, `schedule`, `max_capacity`, `description`, `status`, `created_at`, `updated_at`) VALUES
(1, 'Newton', 3, 3, 'morning', 23, NULL, 'active', '2025-03-19 15:24:44', '2025-03-19 15:24:44'),
(2, 'Aristotle', 1, 1, 'morning', 25, NULL, 'active', '2025-03-19 15:25:03', '2025-03-19 15:25:03');

-- --------------------------------------------------------

--
-- Table structure for table `tbl_students`
--

CREATE TABLE `tbl_students` (
  `id` int(11) NOT NULL,
  `parent_id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `birthdate` date NOT NULL,
  `age` int(11) NOT NULL,
  `gender` enum('male','female') NOT NULL,
  `address` text NOT NULL,
  `previous_school` varchar(100) DEFAULT NULL,
  `enrollment_status` enum('pending','enrolled','rejected') DEFAULT 'pending',
  `admin_comments` text DEFAULT NULL,
  `level_id` int(11) NOT NULL,
  `section_id` int(11) DEFAULT NULL,
  `schedule` enum('morning','afternoon') NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tbl_students`
--

INSERT INTO `tbl_students` (`id`, `parent_id`, `name`, `birthdate`, `age`, `gender`, `address`, `previous_school`, `enrollment_status`, `admin_comments`, `level_id`, `section_id`, `schedule`, `created_at`) VALUES
(1, 2, 'Neil Joebert Emborgo', '2019-04-27', 5, 'male', 'Wao, Lanao del Sur', 'NA', 'enrolled', NULL, 3, NULL, 'morning', '2025-03-19 04:10:11'),
(2, 2, 'Craig Emborgo', '2021-04-28', 3, 'male', 'Wao, Lanao del Sur', 'N/A', 'enrolled', NULL, 1, 0, 'morning', '2025-03-19 06:11:45'),
(3, 3, 'Chanlee Lagnason Jr.', '2020-01-21', 5, 'male', 'Lapasan, Cagayan de Oro City', 'NA', 'enrolled', NULL, 1, 0, 'morning', '2025-03-19 08:21:04');

-- --------------------------------------------------------

--
-- Table structure for table `tbl_teachers`
--

CREATE TABLE `tbl_teachers` (
  `id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `email` varchar(100) NOT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `specialization` varchar(100) DEFAULT NULL,
  `qualification` varchar(100) DEFAULT NULL,
  `status` enum('active','inactive') DEFAULT 'active',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tbl_teachers`
--

INSERT INTO `tbl_teachers` (`id`, `name`, `email`, `phone`, `specialization`, `qualification`, `status`, `created_at`) VALUES
(1, 'Maria Santos', 'maria.santos@canossa.edu', '09123456789', 'Early Childhood Education', 'Bachelor of Education', 'active', '2025-03-19 13:09:11'),
(2, 'Juan Cruz', 'juan.cruz@canossa.edu', '09234567890', 'Child Development', 'Master of Education', 'active', '2025-03-19 13:09:11'),
(3, 'Ana Joy Reyes', 'ana.reyes@canossa.edu', '09345678901', 'Special Education', 'Bachelor of Special Education', 'active', '2025-03-19 13:09:11');

-- --------------------------------------------------------

--
-- Table structure for table `tbl_users`
--

CREATE TABLE `tbl_users` (
  `id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `email` varchar(100) NOT NULL,
  `password` varchar(255) NOT NULL,
  `role` enum('admin','parent') NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tbl_users`
--

INSERT INTO `tbl_users` (`id`, `name`, `email`, `password`, `role`, `created_at`) VALUES
(1, 'Admin', 'admin@canossa.edu', 'admin123', 'admin', '2025-03-19 03:55:01'),
(2, 'Neil Emborgo', 'neil@gmail.com', '$2y$10$/mN7ToFJZIMbnjBFT9feEO3H7xZ2VKTSzir7SIWjeVf1vkj9xI0.m', 'parent', '2025-03-19 03:58:33'),
(3, 'Chanlee  Lagnason', 'chanlee@gmail.com', '$2y$10$pys4zuqrqQjpOMX.fMHIKONs8SaTUnbKqsPocbvh87rrK/GW0E2Pe', 'parent', '2025-03-19 08:19:44');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `tbl_emergency_contacts`
--
ALTER TABLE `tbl_emergency_contacts`
  ADD PRIMARY KEY (`id`),
  ADD KEY `student_id` (`student_id`);

--
-- Indexes for table `tbl_enrollments`
--
ALTER TABLE `tbl_enrollments`
  ADD PRIMARY KEY (`id`),
  ADD KEY `student_id` (`student_id`),
  ADD KEY `approved_by` (`approved_by`),
  ADD KEY `payment_type_id` (`payment_type_id`);

--
-- Indexes for table `tbl_kindergarten_levels`
--
ALTER TABLE `tbl_kindergarten_levels`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `tbl_levels`
--
ALTER TABLE `tbl_levels`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `tbl_payment_types`
--
ALTER TABLE `tbl_payment_types`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `tbl_receipts`
--
ALTER TABLE `tbl_receipts`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `receipt_number` (`receipt_number`),
  ADD KEY `enrollment_id` (`enrollment_id`);

--
-- Indexes for table `tbl_required_documents`
--
ALTER TABLE `tbl_required_documents`
  ADD PRIMARY KEY (`id`),
  ADD KEY `student_id` (`student_id`);

--
-- Indexes for table `tbl_sections`
--
ALTER TABLE `tbl_sections`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `tbl_students`
--
ALTER TABLE `tbl_students`
  ADD PRIMARY KEY (`id`),
  ADD KEY `parent_id` (`parent_id`),
  ADD KEY `level_id` (`level_id`),
  ADD KEY `section_id` (`section_id`);

--
-- Indexes for table `tbl_teachers`
--
ALTER TABLE `tbl_teachers`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `email` (`email`);

--
-- Indexes for table `tbl_users`
--
ALTER TABLE `tbl_users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `email` (`email`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `tbl_emergency_contacts`
--
ALTER TABLE `tbl_emergency_contacts`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `tbl_enrollments`
--
ALTER TABLE `tbl_enrollments`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `tbl_kindergarten_levels`
--
ALTER TABLE `tbl_kindergarten_levels`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `tbl_levels`
--
ALTER TABLE `tbl_levels`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `tbl_payment_types`
--
ALTER TABLE `tbl_payment_types`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `tbl_receipts`
--
ALTER TABLE `tbl_receipts`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `tbl_required_documents`
--
ALTER TABLE `tbl_required_documents`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `tbl_sections`
--
ALTER TABLE `tbl_sections`
  MODIFY `id` int(128) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `tbl_students`
--
ALTER TABLE `tbl_students`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `tbl_teachers`
--
ALTER TABLE `tbl_teachers`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `tbl_users`
--
ALTER TABLE `tbl_users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
