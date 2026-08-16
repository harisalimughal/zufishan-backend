import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function check() {
  const user = await prisma.user.findFirst({ where: { email: "student@nexora.edu" } });
  console.log("User:", user?.email, "ID:", user?.id);
  if (user) {
    console.log("Match password123:", await bcrypt.compare("password123", user.passwordHash));
    console.log("Match Password123!:", await bcrypt.compare("Password123!", user.passwordHash));
    console.log("Match Password456!:", await bcrypt.compare("Password456!", user.passwordHash));
  }
}

check().finally(() => prisma.$disconnect());
