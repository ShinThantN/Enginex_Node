-- CreateTable
CREATE TABLE `clientprofile` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `bio` TEXT NULL,
    `avatarUrl` VARCHAR(500) NULL,
    `location` VARCHAR(255) NULL,
    `ratingAverage` DECIMAL(3, 2) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `ClientProfile_userId_key`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AlterTable
ALTER TABLE `favorite` ADD COLUMN `clientProfileId` INTEGER NULL;

-- AddForeignKey
ALTER TABLE `clientprofile` ADD CONSTRAINT `ClientProfile_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `favorite` ADD CONSTRAINT `Favorite_clientProfileId_fkey` FOREIGN KEY (`clientProfileId`) REFERENCES `clientprofile`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
