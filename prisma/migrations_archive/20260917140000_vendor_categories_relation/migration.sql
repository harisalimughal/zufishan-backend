-- Align the declared implicit VendorProfile/ProductCategory relation with
-- the _VendorCategories join table used by Prisma.
DO $$
BEGIN
  IF to_regclass('"VendorProfile"') IS NOT NULL
     AND to_regclass('product_categories') IS NOT NULL THEN
    CREATE TABLE IF NOT EXISTS "_VendorCategories" (
      "A" TEXT NOT NULL,
      "B" TEXT NOT NULL,
      CONSTRAINT "_VendorCategories_pkey" PRIMARY KEY ("A", "B")
    );
    CREATE INDEX IF NOT EXISTS "_VendorCategories_B_index" ON "_VendorCategories"("B");

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = '_VendorCategories_A_fkey') THEN
      ALTER TABLE "_VendorCategories"
        ADD CONSTRAINT "_VendorCategories_A_fkey"
        FOREIGN KEY ("A") REFERENCES "product_categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = '_VendorCategories_B_fkey') THEN
      ALTER TABLE "_VendorCategories"
        ADD CONSTRAINT "_VendorCategories_B_fkey"
        FOREIGN KEY ("B") REFERENCES "VendorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    IF to_regclass('"VendorCategory"') IS NOT NULL THEN
      INSERT INTO "_VendorCategories" ("A", "B")
      SELECT pc.id, vc."vendorId"
      FROM "VendorCategory" vc
      JOIN product_categories pc
        ON pc.slug = lower(replace(vc."category"::text, '_', '-'))
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;
END $$;
