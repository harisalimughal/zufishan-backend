import { userService } from "../src/services/user.service";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function test() {
  const user = await prisma.user.findFirst({ where: { email: "student@nexora.edu" } });
  if (user) {
    console.log("Before DB update:", user.email, "|", user.fullName, "|", user.bio);
    const updated = await userService.updateProfile(user.id, {
      fullName: "Harry Smith Verified",
      email: "student@nexora.edu",
      bio: "Software Engineering & AI Student",
    });
    console.log("After DB update:", updated.email, "|", updated.fullName, "|", updated.bio);
  }
}

test().finally(() => prisma.$disconnect());
