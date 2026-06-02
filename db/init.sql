-- =====================================================
-- IG AI Command Center — schema for MySQL/MariaDB (XAMPP)
-- Run via: npm run db:init   (or paste into phpMyAdmin)
-- Idempotent: safe to re-run.
-- =====================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 1;

-- ----- AdminSession -----
CREATE TABLE IF NOT EXISTS `adminsession` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `sessionToken` VARCHAR(255) NOT NULL,
  `email` VARCHAR(255) NOT NULL,
  `expiresAt` DATETIME NOT NULL,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_AdminSession_sessionToken` (`sessionToken`),
  KEY `idx_AdminSession_expiresAt` (`expiresAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----- OAuthState -----
CREATE TABLE IF NOT EXISTS `oauthstate` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `state` VARCHAR(255) NOT NULL,
  `brandName` VARCHAR(64) NOT NULL,
  `expiresAt` DATETIME NOT NULL,
  `usedAt` DATETIME NULL,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_OAuthState_state` (`state`),
  KEY `idx_OAuthState_expiresAt` (`expiresAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----- SocialAccount -----
CREATE TABLE IF NOT EXISTS `socialaccount` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `brandName` VARCHAR(64) NOT NULL,
  `platform` VARCHAR(32) NOT NULL DEFAULT 'INSTAGRAM',
  `igUserId` VARCHAR(64) NOT NULL,
  `pageId` VARCHAR(64) NULL,
  `pageName` VARCHAR(255) NULL,
  `username` VARCHAR(255) NULL,
  `name` VARCHAR(255) NULL,
  `profilePictureUrl` TEXT NULL,
  `followersCount` INT NULL,
  `followsCount` INT NULL,
  `mediaCount` INT NULL,
  `accountType` VARCHAR(64) NULL,
  `encryptedPageAccessToken` TEXT NOT NULL,
  `encryptedUserAccessToken` TEXT NULL,
  `tokenExpiresAt` DATETIME NULL,
  `tokenStatus` VARCHAR(32) NOT NULL DEFAULT 'ACTIVE',
  `scopes` JSON NULL,
  `lastProfileSyncAt` DATETIME NULL,
  `lastMediaSyncAt` DATETIME NULL,
  `lastInsightSyncAt` DATETIME NULL,
  `lastCommentSyncAt` DATETIME NULL,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_SocialAccount_igUserId` (`igUserId`),
  KEY `idx_SocialAccount_brandName` (`brandName`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----- InstagramMedia -----
CREATE TABLE IF NOT EXISTS `instagrammedia` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `socialAccountId` INT NOT NULL,
  `igMediaId` VARCHAR(64) NOT NULL,
  `mediaType` VARCHAR(32) NULL,
  `mediaProductType` VARCHAR(32) NULL,
  `caption` TEXT NULL,
  `permalink` TEXT NULL,
  `mediaUrl` TEXT NULL,
  `thumbnailUrl` TEXT NULL,
  `timestamp` DATETIME NULL,
  `username` VARCHAR(255) NULL,
  `likeCount` INT NULL,
  `commentsCount` INT NULL,
  `rawJson` JSON NULL,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_InstagramMedia_igMediaId` (`igMediaId`),
  KEY `idx_InstagramMedia_socialAccountId` (`socialAccountId`),
  KEY `idx_InstagramMedia_timestamp` (`timestamp`),
  CONSTRAINT `fk_InstagramMedia_socialAccount`
    FOREIGN KEY (`socialAccountId`) REFERENCES `socialaccount`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----- MediaMetricSnapshot -----
CREATE TABLE IF NOT EXISTS `mediametricsnapshot` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `instagramMediaId` INT NOT NULL,
  `views` INT NULL,
  `plays` INT NULL,
  `reach` INT NULL,
  `impressions` INT NULL,
  `likes` INT NULL,
  `comments` INT NULL,
  `shares` INT NULL,
  `saves` INT NULL,
  `totalInteractions` INT NULL,
  `engagementRate` DOUBLE NULL,
  `rawJson` JSON NULL,
  `collectedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_MediaMetricSnapshot_instagramMediaId` (`instagramMediaId`),
  KEY `idx_MediaMetricSnapshot_collectedAt` (`collectedAt`),
  CONSTRAINT `fk_MediaMetricSnapshot_instagramMedia`
    FOREIGN KEY (`instagramMediaId`) REFERENCES `instagrammedia`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----- InstagramComment -----
CREATE TABLE IF NOT EXISTS `instagramcomment` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `socialAccountId` INT NULL,
  `instagramMediaId` INT NULL,
  `igCommentId` VARCHAR(64) NOT NULL,
  `parentCommentId` VARCHAR(64) NULL,
  `username` VARCHAR(255) NULL,
  `text` TEXT NULL,
  `likeCount` INT NULL,
  `timestamp` DATETIME NULL,
  `sentiment` VARCHAR(32) NOT NULL DEFAULT 'UNKNOWN',
  `intent` VARCHAR(64) NOT NULL DEFAULT 'UNKNOWN',
  `suggestedReply` TEXT NULL,
  `needsHumanReview` TINYINT(1) NOT NULL DEFAULT 0,
  `aiAnalyzedAt` DATETIME NULL,
  `rawJson` JSON NULL,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_InstagramComment_igCommentId` (`igCommentId`),
  KEY `idx_InstagramComment_instagramMediaId` (`instagramMediaId`),
  KEY `idx_InstagramComment_timestamp` (`timestamp`),
  KEY `idx_InstagramComment_sentiment` (`sentiment`),
  CONSTRAINT `fk_InstagramComment_socialAccount`
    FOREIGN KEY (`socialAccountId`) REFERENCES `socialaccount`(`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_InstagramComment_instagramMedia`
    FOREIGN KEY (`instagramMediaId`) REFERENCES `instagrammedia`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----- IgWebhookEvent -----
CREATE TABLE IF NOT EXISTS `igwebhookevent` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `eventId` VARCHAR(255) NULL,
  `objectType` VARCHAR(64) NULL,
  `fieldName` VARCHAR(64) NULL,
  `rawPayload` JSON NOT NULL,
  `rawBody` LONGTEXT NULL,
  `processingStatus` VARCHAR(32) NOT NULL DEFAULT 'PENDING',
  `errorMessage` TEXT NULL,
  `receivedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `processedAt` DATETIME NULL,
  PRIMARY KEY (`id`),
  KEY `idx_IgWebhookEvent_processingStatus` (`processingStatus`),
  KEY `idx_IgWebhookEvent_receivedAt` (`receivedAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----- SyncJob -----
CREATE TABLE IF NOT EXISTS `syncjob` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `jobType` VARCHAR(64) NOT NULL,
  `socialAccountId` INT NULL,
  `status` VARCHAR(32) NOT NULL DEFAULT 'PENDING',
  `payload` JSON NULL,
  `errorMessage` TEXT NULL,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `startedAt` DATETIME NULL,
  `finishedAt` DATETIME NULL,
  PRIMARY KEY (`id`),
  KEY `idx_SyncJob_status` (`status`),
  KEY `idx_SyncJob_socialAccountId` (`socialAccountId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----- AuditLog -----
CREATE TABLE IF NOT EXISTS `auditlog` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `actor` VARCHAR(64) NOT NULL,
  `action` VARCHAR(128) NOT NULL,
  `entityType` VARCHAR(64) NOT NULL,
  `entityId` VARCHAR(64) NULL,
  `status` VARCHAR(32) NOT NULL,
  `message` TEXT NULL,
  `metadataJson` JSON NULL,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_AuditLog_entity` (`entityType`, `entityId`),
  KEY `idx_AuditLog_createdAt` (`createdAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----- AiAgentConversation -----
CREATE TABLE IF NOT EXISTS `aiagentconversation` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `title` VARCHAR(255) NOT NULL,
  `createdByEmail` VARCHAR(255) NULL,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deletedAt` DATETIME NULL,
  PRIMARY KEY (`id`),
  KEY `idx_AiAgentConversation_updatedAt` (`updatedAt`),
  KEY `idx_AiAgentConversation_deletedAt` (`deletedAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----- AiAgentMessage -----
CREATE TABLE IF NOT EXISTS `aiagentmessage` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `conversationId` INT NOT NULL,
  `role` VARCHAR(16) NOT NULL,
  `content` LONGTEXT NOT NULL,
  `model` VARCHAR(128) NULL,
  `metadataJson` JSON NULL,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_AiAgentMessage_conversationId_createdAt` (`conversationId`, `createdAt`),
  CONSTRAINT `fk_AiAgentMessage_conversation`
    FOREIGN KEY (`conversationId`) REFERENCES `aiagentconversation`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
