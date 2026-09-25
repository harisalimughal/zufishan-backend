ALTER TABLE "Order"
ADD COLUMN IF NOT EXISTS "paymentProvider" TEXT,
ADD COLUMN IF NOT EXISTS "paymentReference" TEXT,
ADD COLUMN IF NOT EXISTS "paidAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "refundedAt" TIMESTAMP(3);

CREATE UNIQUE INDEX IF NOT EXISTS "Order_paymentReference_key"
ON "Order"("paymentReference");
