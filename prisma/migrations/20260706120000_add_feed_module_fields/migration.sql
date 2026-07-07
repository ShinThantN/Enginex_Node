-- AlterTable: add feed post fields and denormalized engagement counters
ALTER TABLE `Post` ADD COLUMN `title` VARCHAR(255) NOT NULL,
    ADD COLUMN `likeCount` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `commentCount` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `offerCount` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `acceptedContractCount` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `viralScore` DOUBLE NOT NULL DEFAULT 0,
    MODIFY `visibility` ENUM('PUBLIC', 'PRIVATE') NOT NULL DEFAULT 'PUBLIC';

-- CreateIndex: support `sort=latest` feed ordering
CREATE INDEX `Post_createdAt_idx` ON `Post`(`createdAt`);

-- CreateIndex: support `sort=trending` feed ordering by stored viralScore
CREATE INDEX `Post_viralScore_idx` ON `Post`(`viralScore`);

-- CreateIndex: enforce one like per user per post
CREATE UNIQUE INDEX `PostLike_postId_userId_key` ON `PostLike`(`postId`, `userId`);
