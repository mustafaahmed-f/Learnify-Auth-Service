/*
  Warnings:

  - A unique constraint covering the columns `[pendingKey]` on the table `instructorRequest` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE `instructorRequest` ADD COLUMN `pendingKey` VARCHAR(191) NULL;

-- CreateIndex
CREATE UNIQUE INDEX `instructorRequest_pendingKey_key` ON `instructorRequest`(`pendingKey`);

-- CreateIndex
CREATE INDEX `instructorRequest_userId_createdAt_idx` ON `instructorRequest`(`userId`, `createdAt`);
