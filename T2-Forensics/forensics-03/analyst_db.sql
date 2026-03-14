-- MySQL dump 10.13  Distrib 8.0.36, for Linux (x86_64)
-- Host: localhost    Database: analyst_workspace
-- Server version	8.0.36-0ubuntu0.24.04.1
-- ------------------------------------------------------

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Table structure for table `users`
--
DROP TABLE IF EXISTS `users`;
CREATE TABLE `users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `username` varchar(64) NOT NULL,
  `email` varchar(128) DEFAULT NULL,
  `password_hash` varchar(256) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO `users` VALUES
  (1,'admin','admin@ctf.local','b8b8eb83374c0bf3b1c3224159f6119dbfff1b7ed6dfecdd80d4e8a895790a34'),
  (2,'analyst','analyst@ctf.local','ce7e94da0a31af5ce587c4cd6fbc89dc64f9c47e17acc63c6ad90b6fdc443481'),
  (3,'monitor','monitor@ctf.local','6e9756f0e16b1cef848418bc6f6c96b720596a49592e9b33eebf94adea179c6f'),
  (4,'backup_svc','backup@ctf.local','a496dbe551bc238eab906b6969876b655829e5835c626d9dbf615171db8c2c1c');

--
-- Table structure for table `audit_log`
--
DROP TABLE IF EXISTS `audit_log`;
CREATE TABLE `audit_log` (
  `id` int NOT NULL AUTO_INCREMENT,
  `timestamp` datetime NOT NULL,
  `user_id` int DEFAULT NULL,
  `action` varchar(64) NOT NULL,
  `details` text,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO `audit_log` VALUES
  (1,'2024-01-15 14:54:00',3,'login','login performed by user_id=3'),
  (2,'2024-01-15 11:39:00',3,'login','login performed by user_id=3'),
  (3,'2024-01-15 16:45:00',4,'user_create','user_create performed by user_id=4'),
  (4,'2024-01-15 15:44:00',3,'user_create','user_create performed by user_id=3'),
  (5,'2024-01-15 09:06:00',1,'file_access','file_access performed by user_id=1'),
  (6,'2024-01-15 16:26:00',3,'user_create','user_create performed by user_id=3'),
  (7,'2024-01-15 08:28:00',3,'permission_grant','permission_grant performed by user_id=3'),
  (8,'2024-01-15 13:03:00',2,'login','login performed by user_id=2'),
  (9,'2024-01-15 08:17:00',2,'file_access','file_access performed by user_id=2'),
  (10,'2024-01-15 16:02:00',2,'login','login performed by user_id=2'),
  (11,'2024-01-15 10:12:00',4,'file_access','file_access performed by user_id=4'),
  (12,'2024-01-15 13:30:00',4,'permission_grant','permission_grant performed by user_id=4'),
  (13,'2024-01-15 12:53:00',3,'session_refresh','session_refresh performed by user_id=3'),
  (14,'2024-01-15 17:24:00',1,'config_change','config_change performed by user_id=1'),
  (15,'2024-01-15 14:09:00',1,'login','login performed by user_id=1'),
  (16,'2024-01-15 08:01:00',2,'config_change','config_change performed by user_id=2'),
  (17,'2024-01-15 08:18:00',4,'login','login performed by user_id=4'),
  (18,'2024-01-15 12:24:00',1,'config_change','config_change performed by user_id=1'),
  (19,'2024-01-15 12:32:00',3,'login','login performed by user_id=3'),
  (20,'2024-01-15 13:59:00',2,'query_exec','query_exec performed by user_id=2'),
  (21,'2024-01-15 08:05:00',2,'login','login performed by user_id=2'),
  (22,'2024-01-15 12:21:00',2,'permission_grant','permission_grant performed by user_id=2'),
  (23,'2024-01-15 16:46:00',4,'logout','logout performed by user_id=4'),
  (24,'2024-01-15 11:56:00',2,'logout','logout performed by user_id=2'),
  (25,'2024-01-15 12:10:00',4,'logout','logout performed by user_id=4');

--
-- Table structure for table `sessions`
--
DROP TABLE IF EXISTS `sessions`;
CREATE TABLE `sessions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `session_id` varchar(64) NOT NULL,
  `user_id` int DEFAULT NULL,
  `session_data` blob,
  `created_at` datetime NOT NULL,
  `expires_at` datetime NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO `sessions` VALUES
  (1,'2b802e190320f588991039a3fc6ef4cd',1,X'65794a3163325679496a6f6959575274615734694c434a796232786c496a6f6959575274615734694c434a7063434936496a45774c6a41754d433478496e303d','2024-01-15 08:00:00','2024-01-15 20:00:00'),
  (2,'c09f7bb27a6729a96caa22f153a67faf',2,X'526b7842523374304d6c397465584e786246396b64573177587a4e346448493059335266616a6c3366513d3d','2024-01-15 09:30:00','2024-01-15 21:30:00'),
  (3,'77cd4e68f8e1c0a438133e428db93f3e',3,X'65794a3163325679496a6f69625739756158527663694973496e4a76624755694f694a32615756335a5849694c434a7063434936496a45774c6a41754d433431496e303d','2024-01-15 10:15:00','2024-01-15 22:15:00'),
  (4,'73303e0e26d0e3289d62fc08823106bb',4,X'65794a3163325679496a6f69596d466a6133567758334e3259794973496e4a76624755694f694a7a5a584a3261574e6c49697769615841694f6949784d6a63754d4334774c6a456966513d3d','2024-01-15 11:00:00','2024-01-15 23:00:00');

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
-- Dump completed on 2024-01-15 23:59:59
