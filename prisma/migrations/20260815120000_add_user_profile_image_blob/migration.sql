-- AlterTable
ALTER TABLE `User`
    ADD COLUMN `imageData` MEDIUMBLOB NULL,
    ADD COLUMN `imageType` VARCHAR(100) NULL;
