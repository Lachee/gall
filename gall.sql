-- phpMyAdmin SQL Dump
-- version 4.9.2
-- https://www.phpmyadmin.net/
--
-- Host: localhost
-- Generation Time: Jan 03, 2021 at 01:37 AM
-- Server version: 10.4.12-MariaDB
-- PHP Version: 7.2.5

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET AUTOCOMMIT = 0;
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `xve`
--

-- --------------------------------------------------------

--
-- Table structure for table `gall_auto_tags`
--

CREATE TABLE `gall_auto_tags` (
  `user_id` bigint(20) NOT NULL,
  `emote_id` bigint(20) NOT NULL,
  `tag_id` bigint(20) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- --------------------------------------------------------

--
-- Table structure for table `gall_blacklist`
--

CREATE TABLE `gall_blacklist` (
  `user_id` bigint(20) NOT NULL,
  `tag_id` bigint(20) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- --------------------------------------------------------

--
-- Table structure for table `gall_emotes`
--

CREATE TABLE `gall_emotes` (
  `id` bigint(20) NOT NULL,
  `guild_id` bigint(20) DEFAULT NULL COMMENT 'FK guild',
  `snowflake` bigint(20) DEFAULT NULL COMMENT 'Discord Snowflake',
  `name` text DEFAULT NULL COMMENT 'Name of Emoji',
  `animated` tinyint(1) NOT NULL DEFAULT 0,
  `founder_id` bigint(20) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- --------------------------------------------------------

--
-- Table structure for table `gall_favourites`
--

CREATE TABLE `gall_favourites` (
  `gallery_id` bigint(20) NOT NULL,
  `user_id` bigint(20) NOT NULL,
  `date_created` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- --------------------------------------------------------

--
-- Table structure for table `gall_gallery`
--

CREATE TABLE `gall_gallery` (
  `id` bigint(20) NOT NULL,
  `identifier` text NOT NULL,
  `founder_id` bigint(20) NOT NULL COMMENT 'FK: user',
  `guild_id` bigint(20) DEFAULT NULL COMMENT 'FK Guild',
  `channel_snowflake` bigint(20) DEFAULT NULL COMMENT 'Discord Channel ID',
  `message_snowflake` bigint(20) DEFAULT NULL COMMENT 'Discord Message ID',
  `title` text CHARACTER SET utf8mb4 NOT NULL,
  `description` text CHARACTER SET utf8mb4 NOT NULL DEFAULT '',
  `type` varchar(10) NOT NULL COMMENT 'artwork, comic',
  `scraper` text NOT NULL,
  `url` text NOT NULL COMMENT 'url to original',
  `cover_id` bigint(20) DEFAULT NULL COMMENT 'FK: image',
  `views` bigint(20) NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- --------------------------------------------------------

--
-- Table structure for table `gall_guilds`
--

CREATE TABLE `gall_guilds` (
  `id` bigint(20) NOT NULL,
  `snowflake` bigint(20) NOT NULL,
  `name` text NOT NULL,
  `active` tinyint(1) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- --------------------------------------------------------

--
-- Table structure for table `gall_image`
--

CREATE TABLE `gall_image` (
  `id` bigint(20) NOT NULL,
  `url` text DEFAULT NULL,
  `delete_url` text DEFAULT NULL,
  `origin` text NOT NULL,
  `scraper` text NOT NULL,
  `is_cover` tinyint(1) NOT NULL DEFAULT 0 COMMENT 'This image is only for the cover.',
  `founder_id` bigint(20) NOT NULL COMMENT 'FK: user',
  `gallery_id` bigint(20) NOT NULL COMMENT 'FK: gallery',
  `date_created` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- --------------------------------------------------------

--
-- Table structure for table `gall_reaction`
--

CREATE TABLE `gall_reaction` (
  `user_id` bigint(20) NOT NULL,
  `gallery_id` bigint(20) NOT NULL,
  `emote_id` bigint(20) NOT NULL,
  `date_created` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- --------------------------------------------------------

--
-- Table structure for table `gall_sparkles`
--

CREATE TABLE `gall_sparkles` (
  `id` bigint(20) NOT NULL COMMENT 'Auto incrementing id',
  `user_id` bigint(20) NOT NULL COMMENT 'FK user',
  `gallery_id` bigint(20) DEFAULT NULL COMMENT 'FK Gallery that caused it',
  `type` varchar(128) NOT NULL COMMENT 'What caused the sparkle, like FAVOURITE or UNFAVOURITE',
  `score` int(11) NOT NULL COMMENT 'Value of the sparkle',
  `resource` varchar(128) DEFAULT NULL COMMENT 'Key data to identify the source (like a favourite id)',
  `date_created` datetime NOT NULL DEFAULT current_timestamp() COMMENT 'Date the sparkle was added'
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

--
-- Triggers `gall_sparkles`
--
DELIMITER $$
CREATE TRIGGER `trg_delete_sparkles` AFTER DELETE ON `gall_sparkles` FOR EACH ROW UPDATE `gall_users` as U SET U.score = U.score - OLD.score WHERE U.id = OLD.user_id
$$
DELIMITER ;
DELIMITER $$
CREATE TRIGGER `trig_insert_sparkles` AFTER INSERT ON `gall_sparkles` FOR EACH ROW UPDATE `gall_users` as U SET U.score = U.score + NEW.score WHERE U.id = NEW.user_id
$$
DELIMITER ;
DELIMITER $$
CREATE TRIGGER `trig_update_sparkles` AFTER UPDATE ON `gall_sparkles` FOR EACH ROW UPDATE `gall_users` as U SET U.score = U.score - OLD.score + NEW.score WHERE U.id = NEW.user_id
$$
DELIMITER ;

-- --------------------------------------------------------

--
-- Table structure for table `gall_tags`
--

CREATE TABLE `gall_tags` (
  `tag_id` bigint(20) NOT NULL,
  `gallery_id` bigint(20) NOT NULL,
  `founder_id` bigint(20) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

--
-- Triggers `gall_tags`
--
DELIMITER $$
CREATE TRIGGER `trig_update_counts` AFTER INSERT ON `gall_tags` FOR EACH ROW UPDATE `gall_tag_defs` SET `cnt` = (SELECT COUNT(*) FROM `gall_tags` WHERE tag_id = `gall_tag_defs`.`id`) WHERE `gall_tag_defs`.`id` = NEW.tag_id
$$
DELIMITER ;

-- --------------------------------------------------------

--
-- Table structure for table `gall_tag_defs`
--

CREATE TABLE `gall_tag_defs` (
  `id` bigint(20) NOT NULL,
  `alias_id` bigint(20) DEFAULT NULL COMMENT 'FK:tag_defs',
  `name` text NOT NULL,
  `founder_id` bigint(20) NOT NULL COMMENT 'FK:user',
  `type` varchar(6) NOT NULL DEFAULT 'TAG' COMMENT 'TAG, CHAR, ARTIST',
  `rating` int(1) NOT NULL DEFAULT 0,
  `date_created` timestamp NOT NULL DEFAULT current_timestamp(),
  `cnt` bigint(20) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- --------------------------------------------------------

--
-- Table structure for table `gall_users`
--

CREATE TABLE `gall_users` (
  `id` bigint(20) NOT NULL,
  `uuid` varchar(255) NOT NULL,
  `username` text NOT NULL,
  `accessKey` varchar(32) DEFAULT NULL,
  `apiKey` varchar(32) NOT NULL DEFAULT '',
  `snowflake` bigint(20) NOT NULL,
  `profile_name` varchar(32) DEFAULT NULL,
  `profile_image` bigint(20) DEFAULT NULL,
  `score` bigint(20) NOT NULL COMMENT 'Sparkles'
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

--
-- Indexes for dumped tables
--

--
-- Indexes for table `gall_auto_tags`
--
ALTER TABLE `gall_auto_tags`
  ADD KEY `fk_auto_tags_user_id` (`user_id`),
  ADD KEY `fk_auto_tags_emote_id` (`emote_id`),
  ADD KEY `fk_auto_tags_tag_id` (`tag_id`);

--
-- Indexes for table `gall_blacklist`
--
ALTER TABLE `gall_blacklist`
  ADD KEY `fk_blacklist_user` (`user_id`),
  ADD KEY `fk_blacklist_tag` (`tag_id`);

--
-- Indexes for table `gall_emotes`
--
ALTER TABLE `gall_emotes`
  ADD PRIMARY KEY (`id`),
  ADD KEY `snowflake` (`snowflake`),
  ADD KEY `fk_emotes_guild_id` (`guild_id`),
  ADD KEY `fk_emotes_founder_id` (`founder_id`);

--
-- Indexes for table `gall_favourites`
--
ALTER TABLE `gall_favourites`
  ADD PRIMARY KEY (`gallery_id`,`user_id`),
  ADD KEY `fk_fav_user` (`user_id`);

--
-- Indexes for table `gall_gallery`
--
ALTER TABLE `gall_gallery`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_gallery_user` (`founder_id`),
  ADD KEY `fk_gallery_thumbnail` (`cover_id`),
  ADD KEY `fk_gallery_guild` (`guild_id`);

--
-- Indexes for table `gall_guilds`
--
ALTER TABLE `gall_guilds`
  ADD PRIMARY KEY (`id`),
  ADD KEY `gall_guilds_snowflake` (`snowflake`);

--
-- Indexes for table `gall_image`
--
ALTER TABLE `gall_image`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_image_gallery` (`gallery_id`),
  ADD KEY `fk_image_user` (`founder_id`);

--
-- Indexes for table `gall_reaction`
--
ALTER TABLE `gall_reaction`
  ADD PRIMARY KEY (`user_id`,`gallery_id`,`emote_id`),
  ADD KEY `fk_reaction_gallery_id` (`gallery_id`),
  ADD KEY `fk_reaction_emote_id` (`emote_id`);

--
-- Indexes for table `gall_sparkles`
--
ALTER TABLE `gall_sparkles`
  ADD PRIMARY KEY (`id`),
  ADD KEY `[resource]` (`resource`),
  ADD KEY `fk_sparkles_user_id` (`user_id`),
  ADD KEY `fk_sparkles_gallery_id` (`gallery_id`);

--
-- Indexes for table `gall_tags`
--
ALTER TABLE `gall_tags`
  ADD PRIMARY KEY (`tag_id`,`gallery_id`),
  ADD KEY `fk_tags_gallery` (`gallery_id`),
  ADD KEY `fk_tags_founder` (`founder_id`);

--
-- Indexes for table `gall_tag_defs`
--
ALTER TABLE `gall_tag_defs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_tag_defs_founder_id` (`founder_id`),
  ADD KEY `lk_tag_defs_alias` (`alias_id`);

--
-- Indexes for table `gall_users`
--
ALTER TABLE `gall_users`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_users_profile_image` (`profile_image`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `gall_emotes`
--
ALTER TABLE `gall_emotes`
  MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `gall_gallery`
--
ALTER TABLE `gall_gallery`
  MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `gall_guilds`
--
ALTER TABLE `gall_guilds`
  MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `gall_image`
--
ALTER TABLE `gall_image`
  MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `gall_sparkles`
--
ALTER TABLE `gall_sparkles`
  MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT COMMENT 'Auto incrementing id';

--
-- AUTO_INCREMENT for table `gall_tag_defs`
--
ALTER TABLE `gall_tag_defs`
  MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `gall_users`
--
ALTER TABLE `gall_users`
  MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `gall_auto_tags`
--
ALTER TABLE `gall_auto_tags`
  ADD CONSTRAINT `fk_auto_tags_emote_id` FOREIGN KEY (`emote_id`) REFERENCES `gall_emotes` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_auto_tags_tag_id` FOREIGN KEY (`tag_id`) REFERENCES `gall_tag_defs` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_auto_tags_user_id` FOREIGN KEY (`user_id`) REFERENCES `gall_users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `gall_blacklist`
--
ALTER TABLE `gall_blacklist`
  ADD CONSTRAINT `fk_blacklist_tag` FOREIGN KEY (`tag_id`) REFERENCES `gall_tag_defs` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_blacklist_user` FOREIGN KEY (`user_id`) REFERENCES `gall_users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `gall_emotes`
--
ALTER TABLE `gall_emotes`
  ADD CONSTRAINT `fk_emotes_founder_id` FOREIGN KEY (`founder_id`) REFERENCES `gall_users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_emotes_guild_id` FOREIGN KEY (`guild_id`) REFERENCES `gall_guilds` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `gall_favourites`
--
ALTER TABLE `gall_favourites`
  ADD CONSTRAINT `fk_fav_gallery` FOREIGN KEY (`gallery_id`) REFERENCES `gall_gallery` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_fav_user` FOREIGN KEY (`user_id`) REFERENCES `gall_users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `gall_gallery`
--
ALTER TABLE `gall_gallery`
  ADD CONSTRAINT `fk_gallery_guild` FOREIGN KEY (`guild_id`) REFERENCES `gall_guilds` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_gallery_thumbnail` FOREIGN KEY (`cover_id`) REFERENCES `gall_image` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_gallery_user` FOREIGN KEY (`founder_id`) REFERENCES `gall_users` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE;

--
-- Constraints for table `gall_image`
--
ALTER TABLE `gall_image`
  ADD CONSTRAINT `fk_image_gallery` FOREIGN KEY (`gallery_id`) REFERENCES `gall_gallery` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_image_user` FOREIGN KEY (`founder_id`) REFERENCES `gall_users` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE;

--
-- Constraints for table `gall_reaction`
--
ALTER TABLE `gall_reaction`
  ADD CONSTRAINT `fk_reaction_emote_id` FOREIGN KEY (`emote_id`) REFERENCES `gall_emotes` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_reaction_gallery_id` FOREIGN KEY (`gallery_id`) REFERENCES `gall_gallery` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_reaction_user_Id` FOREIGN KEY (`user_id`) REFERENCES `gall_users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `gall_sparkles`
--
ALTER TABLE `gall_sparkles`
  ADD CONSTRAINT `fk_sparkles_gallery_id` FOREIGN KEY (`gallery_id`) REFERENCES `gall_gallery` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_sparkles_user_id` FOREIGN KEY (`user_id`) REFERENCES `gall_users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `gall_tags`
--
ALTER TABLE `gall_tags`
  ADD CONSTRAINT `fk_tags_founder` FOREIGN KEY (`founder_id`) REFERENCES `gall_users` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_tags_gallery` FOREIGN KEY (`gallery_id`) REFERENCES `gall_gallery` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_tags_tag` FOREIGN KEY (`tag_id`) REFERENCES `gall_tag_defs` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `gall_tag_defs`
--
ALTER TABLE `gall_tag_defs`
  ADD CONSTRAINT `fk_tag_defs_founder_id` FOREIGN KEY (`founder_id`) REFERENCES `gall_users` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE,
  ADD CONSTRAINT `lk_tag_defs_alias` FOREIGN KEY (`alias_id`) REFERENCES `gall_tag_defs` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Constraints for table `gall_users`
--
ALTER TABLE `gall_users`
  ADD CONSTRAINT `fk_users_profile_image` FOREIGN KEY (`profile_image`) REFERENCES `gall_image` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
