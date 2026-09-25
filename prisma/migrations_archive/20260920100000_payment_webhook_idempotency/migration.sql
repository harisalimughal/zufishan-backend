DO $$
BEGIN
  IF to_regclass('"Order"') IS NOT NULL THEN
    ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "paymentReference" TEXT;
    CREATE UNIQUE INDEX IF NOT EXISTS "Order_paymentReference_key" ON "Order"("paymentReference");
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('"Order"') IS NOT NULL THEN
    CREATE TABLE IF NOT EXISTS "PaymentWebhookEvent" (
      "id" TEXT NOT NULL,
      "eventId" TEXT NOT NULL,
      "orderId" TEXT NOT NULL,
      "status" TEXT NOT NULL,
      "signature" TEXT NOT NULL,
      "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "PaymentWebhookEvent_pkey" PRIMARY KEY ("id")
    );
    CREATE UNIQUE INDEX IF NOT EXISTS "PaymentWebhookEvent_eventId_key" ON "PaymentWebhookEvent"("eventId");
    CREATE INDEX IF NOT EXISTS "PaymentWebhookEvent_orderId_idx" ON "PaymentWebhookEvent"("orderId");
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PaymentWebhookEvent_orderId_fkey') THEN
      ALTER TABLE "PaymentWebhookEvent"
        ADD CONSTRAINT "PaymentWebhookEvent_orderId_fkey"
        FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
  END IF;
END $$;
