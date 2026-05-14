/*
  Warnings:

  - You are about to drop the column `loginPassword` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `loginUsername` on the `Order` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Order" DROP COLUMN "loginPassword",
DROP COLUMN "loginUsername";
