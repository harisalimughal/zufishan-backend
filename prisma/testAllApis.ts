import { PrismaClient } from "@prisma/client";

const BASE_URL = "http://localhost:4000/api";
const prisma = new PrismaClient();

interface TestResult {
  endpoint: string;
  method: string;
  status: number;
  success: boolean;
  message?: string;
  dataSnippet?: string;
}

async function runAllApiTests() {
  console.log("\n=======================================================");
  console.log("🚀 COMPREHENSIVE API AUDIT TESTER — ALL ENDPOINTS");
  console.log("=======================================================\n");

  const results: TestResult[] = [];

  // 1. Get or Create Test User & Login
  console.log("🔑 Authenticating test user...");
  let token = "";
  let refreshToken = "";
  let userId = "";
  let activePassword = "password123";

  try {
    const loginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "student@nexora.edu", password: "password123" }),
    });

    const loginData = await loginRes.json();
    if (loginRes.ok && loginData.data?.tokens?.accessToken) {
      token = loginData.data.tokens.accessToken;
      refreshToken = loginData.data.tokens.refreshToken;
      userId = loginData.data.user.id;
      console.log(`✅ Logged in successfully. User ID: ${userId}`);
    } else {
      console.error("❌ Login failed:", loginData);
    }
  } catch (err: any) {
    console.error("❌ Auth connection error:", err.message);
  }

  // Dynamic Auth Header getter AFTER token is populated
  const getAuthHeader = () => ({ Authorization: `Bearer ${token}`, "Content-Type": "application/json" });

  // Fetch dynamic DB IDs for testing endpoints that require parameters
  const firstCourse = await prisma.course.findFirst();
  const courseId = firstCourse?.id || "test-course-id";
  const courseSlug = firstCourse?.detailSlug || "database-101";

  const firstAssignment = await prisma.assignment.findFirst();
  const assignmentId = firstAssignment?.id || "test-assignment-id";

  // Helper request function
  async function test(method: string, path: string, body?: any, useAuth: boolean = true, customToken?: string) {
    const headers = useAuth
      ? (customToken ? { Authorization: `Bearer ${customToken}`, "Content-Type": "application/json" } : getAuthHeader())
      : { "Content-Type": "application/json" };
    try {
      const res = await fetch(`${BASE_URL}${path}`, {
        method,
        headers,
        ...(body ? { body: JSON.stringify(body) } : {}),
      });

      const resText = await res.text();
      let resJson: any = {};
      try {
        resJson = JSON.parse(resText);
      } catch {
        resJson = { raw: resText };
      }

      const isSuccess = res.status >= 200 && res.status < 300;
      results.push({
        endpoint: path,
        method,
        status: res.status,
        success: isSuccess,
        message: resJson.message || (isSuccess ? "OK" : "Failed"),
        dataSnippet: JSON.stringify(resJson).slice(0, 80),
      });
    } catch (err: any) {
      results.push({
        endpoint: path,
        method,
        status: 500,
        success: false,
        message: err.message,
      });
    }
  }

  // ---------------------------------------------------------
  // 1. HEALTH & SYSTEM
  // ---------------------------------------------------------
  console.log("📍 Testing Health...");
  await test("GET", "/health", undefined, false);

  // ---------------------------------------------------------
  // 2. AUTH MODULE
  // ---------------------------------------------------------
  console.log("📍 Testing Auth APIs...");
  const tempEmail = `testuser_${Date.now()}_${Math.floor(Math.random() * 10000)}@nexora.edu`;
  let tempToken = "";
  
  try {
    const regRes = await fetch(`${BASE_URL}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: tempEmail, password: "Password123!", firstName: "Test", lastName: "Audit" }),
    });
    const regData = await regRes.json();
    
    // Login as temp user to get tempToken
    const tempLoginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: tempEmail, password: "Password123!" }),
    });
    const tempLoginData = await tempLoginRes.json();
    tempToken = tempLoginData.data?.tokens?.accessToken || "";

    results.push({
      endpoint: "/auth/register",
      method: "POST",
      status: regRes.status,
      success: regRes.ok,
      message: regData.message || "OK",
    });
  } catch (err: any) {
    results.push({ endpoint: "/auth/register", method: "POST", status: 500, success: false, message: err.message });
  }

  await test("POST", "/auth/login", { email: tempEmail, password: "Password123!" }, false);
  await test("GET", "/auth/me");

  // Create a second user for receiver messaging tests
  let receiverId = userId;
  try {
    const recUser = await prisma.user.upsert({
      where: { email: "receiver@nexora.edu" },
      update: {},
      create: {
        email: "receiver@nexora.edu",
        fullName: "Test Receiver User",
        passwordHash: "$2a$10$ePig7Vb3K9yKKrs4kjAD.PyNtOm8Wx87k/nGQaVcUWyMl9p2Jr.G",
        role: "STUDENT",
      },
    });
    receiverId = recUser.id;
  } catch (err) {}

  // ---------------------------------------------------------
  // 3. USER & SETTINGS MODULE
  // ---------------------------------------------------------
  console.log("📍 Testing User & Settings APIs...");
  await test("GET", "/users/profile");
  await test("PUT", "/users/profile", { fullName: "Harry Smith Updated", bio: "Updated test bio" });
  await test("PUT", "/users/preferences", { theme: "dark", language: "English", notificationsEnabled: true });
  await test("PUT", "/users/password", { currentPassword: "Password123!", newPassword: "NewPassword456!" }, true, tempToken);

  // ---------------------------------------------------------
  // 4. COURSES & RESOURCES MODULE
  // ---------------------------------------------------------
  console.log("📍 Testing Courses & Resources APIs...");
  await test("GET", "/courses", undefined, false);
  await test("GET", `/courses/${courseId}`, undefined, false);
  await test("GET", `/courses/slug/${courseSlug}`, undefined, false);
  const newCourseSlug = `test-course-${Date.now()}`;
  await test("POST", "/courses", { title: "Test Audit Course", detailSlug: newCourseSlug, description: "Test course", instructorName: "Test Prof", category: "Audit" });
  await test("PUT", `/courses/${courseId}`, { title: "Database 101 Advanced" });
  await test("GET", `/courses/${courseId}/resources`);
  await test("POST", `/courses/${courseId}/resources`, { title: "Cheatsheet.pdf", fileUrl: "https://example.com/sheet.pdf", fileType: "pdf" });

  // ---------------------------------------------------------
  // 5. ASSIGNMENTS & SUBMISSIONS MODULE
  // ---------------------------------------------------------
  console.log("📍 Testing Assignments & Submissions APIs...");
  await test("GET", "/assignments");
  await test("GET", `/assignments/${assignmentId}`);
  await test("POST", `/assignments/${assignmentId}/submit`, { fileUrl: "https://example.com/sub.pdf" });
  await test("GET", "/submissions");

  const subAssignment = await prisma.assignment.create({
    data: {
      courseId,
      title: `Sub Assignment ${Date.now()}`,
      description: "Sub test",
      dueDate: new Date(Date.now() + 86400000),
    },
  });

  await test("POST", "/submissions", { assignmentId: subAssignment.id, userId, content: "Direct Submission Content", fileUrl: "https://example.com/sub.pdf" });

  const firstSubmission = await prisma.submission.findFirst({ where: { userId } });
  if (firstSubmission) {
    await test("GET", `/submissions/${firstSubmission.id}`);
    await test("GET", `/submissions/assignment/${firstSubmission.assignmentId}`);
    await test("PATCH", `/submissions/${firstSubmission.id}`, { content: "Updated content" });
  }

  // ---------------------------------------------------------
  // 6. ACHIEVEMENTS & ACTIVITY FEED
  // ---------------------------------------------------------
  console.log("📍 Testing Achievements APIs...");
  await test("GET", "/achievements");
  await test("GET", "/achievements/activity-feed");
  await test("POST", "/achievements/check");

  // ---------------------------------------------------------
  // 7. ENROLLMENT & PROGRESS MODULE
  // ---------------------------------------------------------
  console.log("📍 Testing Enrollment APIs...");
  await test("GET", "/enrollments");
  await test("GET", "/enrollments/progress/summary");

  const enrollCourse = await prisma.course.create({
    data: {
      title: `Enroll Course ${Date.now()}`,
      detailSlug: `enroll-slug-${Date.now()}`,
      description: "Enroll test",
      instructorName: "Prof. Test",
      category: "Testing",
    },
  });

  await test("POST", `/enrollments/courses/${enrollCourse.id}`);
  await test("PATCH", `/enrollments/courses/${enrollCourse.id}/progress`, { progressPercent: 75 });

  // ---------------------------------------------------------
  // 8. ATTENDANCE & STREAKS MODULE
  // ---------------------------------------------------------
  console.log("📍 Testing Attendance APIs...");
  await test("GET", `/attendance/courses/${courseId}`);
  await test("GET", "/attendance/streak");

  // ---------------------------------------------------------
  // 9. MESSAGING & CHAT MODULE
  // ---------------------------------------------------------
  console.log("📍 Testing Messaging APIs...");
  await test("GET", "/messages");
  await test("POST", "/messages", { receiverId, senderId: userId, content: "Hello friend!" });
  await test("GET", `/messages/conversation/${userId}/${receiverId}`);
  
  const firstMsg = await prisma.message.findFirst({ where: { senderId: userId } });
  if (firstMsg) {
    await test("PATCH", `/messages/${firstMsg.id}/read`);
  }

  await test("GET", "/group-messages");
  await test("GET", "/group-messages/channel/db101");
  await test("POST", "/group-messages", { channelId: "db101", senderId: userId, content: "Group test message" });

  const firstGrpMsg = await prisma.groupMessage.findFirst({ where: { channelId: "db101" } });
  if (firstGrpMsg) {
    await test("PUT", `/group-messages/${firstGrpMsg.id}`, { content: "Updated group message" });
  }

  // ---------------------------------------------------------
  // 10. CALENDAR EVENTS MODULE
  // ---------------------------------------------------------
  console.log("📍 Testing Calendar Events APIs...");
  await test("GET", "/calendar-events");
  await test("GET", `/calendar-events/user/${userId}`);
  await test("POST", "/calendar-events", {
    userId,
    courseId,
    title: "Dynamic Audit Event",
    startTime: new Date().toISOString(),
    endTime: new Date(Date.now() + 3600000).toISOString(),
    type: "CLASS",
    location: "Online",
    isLive: true,
  });

  const firstEvent = await prisma.calendarEvent.findFirst({ where: { userId } });
  if (firstEvent) {
    await test("GET", `/calendar-events/${firstEvent.id}`);
    await test("PUT", `/calendar-events/${firstEvent.id}`, { title: "Updated Audit Event" });
  }

  // Final logout test
  await test("POST", "/auth/logout", { refreshToken });

  // ---------------------------------------------------------
  // SUMMARY REPORT
  // ---------------------------------------------------------
  console.log("\n=======================================================");
  console.log("📊 ALL ENDPOINTS TEST AUDIT RESULTS SUMMARY");
  console.log("=======================================================\n");

  const passed = results.filter((r) => r.success);
  const failed = results.filter((r) => !r.success);

  console.table(
    results.map((r) => ({
      Method: r.method,
      Endpoint: r.endpoint,
      Status: r.status,
      Result: r.success ? "✅ PASS" : "❌ FAIL",
      Message: r.message,
    }))
  );

  console.log(`\n🎉 Total Tested: ${results.length}`);
  console.log(`✅ Passed: ${passed.length}`);
  console.log(`❌ Failed: ${failed.length}`);

  if (failed.length === 0) {
    console.log("\n🏆 100% OF ALL APIS ARE WORKING PERFECTLY!");
  } else {
    console.log(`\n⚠️  ${failed.length} endpoints failed:`);
    failed.forEach((f) => console.log(`  - [${f.method}] ${f.endpoint} -> Status ${f.status}: ${f.message}`));
  }

  await prisma.$disconnect();
}

runAllApiTests().catch((e) => {
  console.error("Test runner crash:", e);
});
