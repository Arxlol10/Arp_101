-- ============================================
-- RedTeam Corp — Database Backup
-- Generated: 2024-01-10 03:00:01 UTC
-- Server: db-prod-01.redteam-corp.local
-- Database: redteam_prod
-- ============================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- -------------------------------------------
-- Table: users
-- -------------------------------------------
DROP TABLE IF EXISTS `users`;
CREATE TABLE `users` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `username` varchar(64) NOT NULL,
  `email` varchar(128) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `role` enum('user','admin','superadmin') DEFAULT 'user',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_username` (`username`),
  UNIQUE KEY `idx_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO `users` VALUES
(1, 'admin', 'admin@redteam-corp.local', '$2y$10$Xk9mP2vL7nQ4wR8tY1uI5.dummy.hash.value', 'superadmin', '2023-06-01 00:00:00'),
(2, 'jsmith', 'j.smith@redteam-corp.local', '$2y$10$Rp3kL8mN5vQ2wX7tZ0uI4.dummy.hash.value', 'admin', '2023-07-15 10:30:00'),
(3, 'analyst01', 'analyst01@redteam-corp.local', '$2y$10$Wn6jH4kM9xB1cF3gT8vA2.dummy.hash.value', 'user', '2023-08-20 14:15:00');

-- -------------------------------------------
-- Table: sessions
-- -------------------------------------------
DROP TABLE IF EXISTS `sessions`;
CREATE TABLE `sessions` (
  `id` varchar(128) NOT NULL,
  `user_id` int(11) DEFAULT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `last_active` datetime DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- -------------------------------------------
-- Table: flags
-- -------------------------------------------
DROP TABLE IF EXISTS `flags`;
CREATE TABLE `flags` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `challenge_name` varchar(64) NOT NULL,
  `flag_value` varchar(128) NOT NULL,
  `points` int(11) DEFAULT 0,
  `active` tinyint(1) DEFAULT 1,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO `flags` VALUES
(1, 'web-master', 'FLAG{t0_sql_dump_fake_fl4g}', 500, 1),
(2, 'crypto-bonus', 'FLAG{rotate_before_deploy}', 300, 0),
(3, 'network-entry', 'FLAG{placeholder_replace_me}', 200, 0);

-- -------------------------------------------
-- Table: api_tokens
-- -------------------------------------------
DROP TABLE IF EXISTS `api_tokens`;
CREATE TABLE `api_tokens` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `token` varchar(255) NOT NULL,
  `expires_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO `api_tokens` VALUES
(1, 1, 'tok_s3cr3t_4dm1n_t0k3n_pr0d', '2025-01-01 00:00:00'),
(2, 2, 'tok_jsmith_r34d0nly_4cc3ss', '2025-01-01 00:00:00');

SET FOREIGN_KEY_CHECKS = 1;

-- Backup completed: 2024-01-10 03:00:47 UTC
-- Size: 14.2 MB (compressed: 3.1 MB)
