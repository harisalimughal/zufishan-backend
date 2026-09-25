-- Marketplace integrity constraints and payment state.
ALTER TYPE "VendorApprovalStatus" ADD VALUE IF NOT EXISTS 'SUSPENDED';

DO $$
BEGIN
  IF to_regclass('"Order"') IS NOT NULL THEN
    ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "paymentStatus" TEXT NOT NULL DEFAULT 'PENDING';
  END IF;
  IF to_regclass('"Cart"') IS NOT NULL THEN
    CREATE UNIQUE INDEX IF NOT EXISTS "Cart_buyerId_key" ON "Cart"("buyerId");
  END IF;
  IF to_regclass('"Rating"') IS NOT NULL THEN
    CREATE UNIQUE INDEX IF NOT EXISTS "Rating_buyerId_productId_key" ON "Rating"("buyerId", "productId");
  END IF;
  IF to_regclass('"ReturnRequest"') IS NOT NULL THEN
    CREATE UNIQUE INDEX IF NOT EXISTS "ReturnRequest_buyerId_orderItemId_key" ON "ReturnRequest"("buyerId", "orderItemId");
  END IF;
END $$;
