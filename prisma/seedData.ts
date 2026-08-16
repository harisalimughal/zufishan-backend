import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function seed() {
  console.log("🌱 Seeding database...");

  // 1. Create Test Student User
  const passwordHash = await bcrypt.hash("password123", 10);
  const student = await prisma.user.upsert({
    where: { email: "student@nexora.edu" },
    update: {
      passwordHash,
    },
    create: {
      email: "student@nexora.edu",
      fullName: "Harry Smith",
      passwordHash,
      role: "STUDENT",
      bio: "Computer Science student passionate about AI and databases.",
      preferences: {
        create: {
          theme: "dark",
          language: "English",
          notificationsEnabled: true,
        },
      },
    },
  });
  console.log(`✅ User created: ${student.email}`);

  // 2. Create Sample Courses
  const dbCourse = await prisma.course.upsert({
    where: { detailSlug: "database-101" },
    update: {},
    create: {
      title: "Database 101",
      detailSlug: "database-101",
      description: "Learn relational database design, SQL querying, and normalization.",
      instructorName: "Prof. Lucas (AI)",
      category: "Computer Science",
      level: "Beginner",
      rating: 4.9,
      totalStudents: 1420,
      liveClassToday: true,
    },
  });

  const aiCourse = await prisma.course.upsert({
    where: { detailSlug: "ai-engineering" },
    update: {},
    create: {
      title: "AI Engineering",
      detailSlug: "ai-engineering",
      description: "Master neural networks, deep learning models, and LLM orchestration.",
      instructorName: "Prof. Ava (AI)",
      category: "AI Engineering",
      level: "Intermediate",
      rating: 4.8,
      totalStudents: 980,
      liveClassToday: false,
    },
  });
  console.log("✅ Sample courses created");

  // 3. Create Sample Assignments
  const assignment1 = await prisma.assignment.create({
    data: {
      courseId: dbCourse.id,
      title: "ER Diagram Design",
      description: "Design a complete ER diagram for a university system.",
      dueDate: new Date(Date.now() + 86400000 * 2), // +2 days
      totalPoints: 20,
    },
  });
  console.log(`✅ Assignment created: ${assignment1.title}`);

  // 4. Create Sample Achievements
  const achievement1 = await prisma.achievement.create({
    data: {
      title: "First Steps",
      description: "Enroll in your first platform course",
      icon: "🌱",
      category: "completion",
      xpPoints: 100,
    },
  });

  const achievement2 = await prisma.achievement.create({
    data: {
      title: "Code Starter",
      description: "Submit your first assignment work",
      icon: "⚡",
      category: "performance",
      xpPoints: 200,
    },
  });
  console.log("✅ Sample achievements created");

  // 5. Create Sample Calendar Events
  await prisma.calendarEvent.create({
    data: {
      userId: student.id,
      courseId: dbCourse.id,
      title: "Database 101 Live Class",
      startTime: new Date(),
      endTime: new Date(Date.now() + 3600000 * 2),
      type: "CLASS",
      location: "Room 101",
      isLive: true,
    },
  });
  console.log("✅ Sample calendar event created");

  console.log("🎉 Database seeding finished successfully!");
}

seed()
  .catch((e) => {
    console.error("❌ Seeding failed:", e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
