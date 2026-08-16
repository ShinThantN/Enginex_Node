-- AlterTable
ALTER TABLE `EngineerPortfolio`
    ADD COLUMN `imageData` MEDIUMBLOB NULL,
    ADD COLUMN `imageType` VARCHAR(100) NULL;

-- AlterTable
ALTER TABLE `Project`
    ADD COLUMN `imageData` MEDIUMBLOB NULL,
    ADD COLUMN `imageType` VARCHAR(100) NULL;

-- AlterTable
ALTER TABLE `Post`
    ADD COLUMN `imageData` MEDIUMBLOB NULL,
    ADD COLUMN `imageType` VARCHAR(100) NULL;
