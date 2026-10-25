-- AlterTable
ALTER TABLE `OutboxEvent` ALTER COLUMN `updatedAt` DROP DEFAULT;

-- AlterTable
ALTER TABLE `User` ALTER COLUMN `updatedAt` DROP DEFAULT;

-- AlterTable
ALTER TABLE `instructorRequest` ALTER COLUMN `updatedAt` DROP DEFAULT;
