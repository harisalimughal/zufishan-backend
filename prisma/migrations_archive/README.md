# Archived Marketplace Migrations

These migration files are preserved for historical reference only. The active migration chain uses `20260921090000_marketplace_baseline`, which provisions the current marketplace schema after the course migration. No application data was removed during the migration-history cleanup.

The superseded marketplace migrations that were still left in `prisma/migrations` (20260902 to 20260912) were moved here as well, since the baseline recreates everything they created and a fresh `prisma migrate deploy` failed on them. `20260904124512_add_marketplace_product/migration.active-chain.sql` is the variant that had been in the active chain.
