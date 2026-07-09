-- AlterTable: add email verification status and OTP storage fields
ALTER TABLE `User` ADD COLUMN `emailVerified` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `otpHash` VARCHAR(255) NULL,
    ADD COLUMN `otpExpiresAt` DATETIME(3) NULL,
    ADD COLUMN `otpLastSentAt` DATETIME(3) NULL;
