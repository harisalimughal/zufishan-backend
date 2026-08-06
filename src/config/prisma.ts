// Single shared PrismaClient instance (singleton) — import this everywhere
// instead of `new PrismaClient()` to avoid exhausting DB connections,
// especially under dev hot-reload.
//
// TODO:
// - export const prisma = new PrismaClient();

import { PrismaClient } from "@prisma/client";

export const prisma = new PrismaClient();
