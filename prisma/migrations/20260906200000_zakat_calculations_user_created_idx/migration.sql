-- Composite index for authenticated Zakat history:
-- WHERE "userId" = $1 ORDER BY "createdAt" DESC
CREATE INDEX "zakat_calculations_userId_createdAt_idx"
    ON "zakat_calculations" ("userId", "createdAt" DESC);
