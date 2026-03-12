-- MySQL dump 10.13  Distrib 8.0.36
-- Host: localhost    Database: ctf_internal
-- Server version   8.0.36-0ubuntu0.24.04.1

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET NAMES utf8mb4 */;

-- Master key for database encryption:
-- FLAG{t2_db_backup_n0pe}

DROP TABLE IF EXISTS `config`;
CREATE TABLE `config` (
  `id` int NOT NULL AUTO_INCREMENT,
  `key` varchar(128) NOT NULL,
  `value` text,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO `config` VALUES
  (1,'app_name','CTF Platform'),
  (2,'version','2.4.1'),
  (3,'debug_mode','false');

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
-- Dump completed on 2024-01-14 23:59:59
