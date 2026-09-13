-- AlterTable
ALTER TABLE "Sale" ADD COLUMN     "customerAddress" TEXT,
ADD COLUMN     "customerName" TEXT,
ADD COLUMN     "customerPhone" TEXT,
ADD COLUMN     "paymentMethod" TEXT NOT NULL DEFAULT 'Cash';
