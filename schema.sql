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

CREATE TABLE `tbl_enrollments` (
  `id` int(11) NOT NULL,
  `student_id` int(11) NOT NULL,
  `enrollment_date` date NOT NULL,
  `approved_by` int(11) DEFAULT NULL,
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

CREATE TABLE `tbl_kindergarten_levels` (
  `id` int(11) NOT NULL,
  `level_name` varchar(50) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `tbl_payment_types` (
  `id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `description` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

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

CREATE TABLE `tbl_sections` (
  `id` int(11) NOT NULL,
  `section_name` varchar(50) NOT NULL,
  `level_id` int(11) DEFAULT NULL,
  `teacher_id` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

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
  `level_id` int(11) NOT NULL,
  `section_id` int(11) DEFAULT NULL,
  `schedule` enum('morning','afternoon') NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `tbl_users` (
  `id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `email` varchar(100) NOT NULL,
  `password` varchar(255) NOT NULL,
  `role` enum('admin','parent') NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Primary Keys
ALTER TABLE `tbl_emergency_contacts`
  ADD PRIMARY KEY (`id`),
  ADD KEY `student_id` (`student_id`);

ALTER TABLE `tbl_enrollments`
  ADD PRIMARY KEY (`id`),
  ADD KEY `student_id` (`student_id`),
  ADD KEY `approved_by` (`approved_by`),
  ADD KEY `payment_type_id` (`payment_type_id`);

ALTER TABLE `tbl_kindergarten_levels`
  ADD PRIMARY KEY (`id`);

ALTER TABLE `tbl_payment_types`
  ADD PRIMARY KEY (`id`);

ALTER TABLE `tbl_receipts`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `receipt_number` (`receipt_number`),
  ADD KEY `enrollment_id` (`enrollment_id`);

ALTER TABLE `tbl_required_documents`
  ADD PRIMARY KEY (`id`),
  ADD KEY `student_id` (`student_id`);

ALTER TABLE `tbl_sections`
  ADD PRIMARY KEY (`id`),
  ADD KEY `level_id` (`level_id`);

ALTER TABLE `tbl_students`
  ADD PRIMARY KEY (`id`),
  ADD KEY `parent_id` (`parent_id`),
  ADD KEY `level_id` (`level_id`),
  ADD KEY `section_id` (`section_id`);

ALTER TABLE `tbl_users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `email` (`email`);

-- AUTO_INCREMENT
ALTER TABLE `tbl_emergency_contacts`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

ALTER TABLE `tbl_enrollments`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

ALTER TABLE `tbl_kindergarten_levels`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

ALTER TABLE `tbl_payment_types`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

ALTER TABLE `tbl_receipts`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

ALTER TABLE `tbl_required_documents`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

ALTER TABLE `tbl_sections`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

ALTER TABLE `tbl_students`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

ALTER TABLE `tbl_users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

-- Insert sample data
INSERT INTO `tbl_kindergarten_levels` (`level_name`) VALUES
('Nursery'),
('Pre-Kinder'),
('Kindergarten');

INSERT INTO `tbl_sections` (`section_name`, `level_id`) VALUES
('Apple', 1),
('Banana', 1),
('Cherry', 2),
('Date', 2),
('Elderberry', 3),
('Fig', 3);

INSERT INTO `tbl_payment_types` (`name`, `amount`, `description`) VALUES
('Enrollment Fee', 5000.00, 'One-time enrollment fee'),
('Tuition Fee', 20000.00, 'Annual tuition fee'),
('Miscellaneous Fee', 3000.00, 'Covers books, materials, and activities');

-- Create admin user with password 'admin123'
INSERT INTO `tbl_users` (`name`, `email`, `password`, `role`) VALUES
('Admin User', 'admin@canossa.edu', 'admin123', 'admin');