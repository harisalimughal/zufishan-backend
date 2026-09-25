/**
 * Zufishan Platform — Help Documentation Corpus
 *
 * Static help articles for ingestion into the RAG knowledge base.
 * Each entry covers a key area of the platform that users commonly ask about.
 *
 * Add new articles here and re-run: npx tsx scripts/ingestCorpus.ts
 */

export interface HelpDoc {
  title: string
  content: string
  url?: string
}

export const HELP_DOCS: HelpDoc[] = [
  {
    title: 'Getting Started with Zufishan',
    url: '/help/getting-started',
    content: `
Welcome to Zufishan — your Islamic learning companion.

Getting Started:
After signing up, you will land on your personal Dashboard. The Dashboard shows your enrolled courses, your current learning streak, upcoming calendar events, and a quick-access bar for Islamic utilities (Prayer Times, Qibla, Zakat Calculator, and more).

Creating Your Account:
Visit the Zufishan sign-up page and enter your full name, email address, and a strong password. After registration you will receive a verification email — click the link to activate your account. You can then log in and set up your profile including your bio, avatar, and language preference.

Navigation:
The main navigation sidebar contains links to: Dashboard, Courses, Assignments, Messages, Calendar, Achievements, and the Utilities section. On mobile, tap the hamburger icon in the top-left corner to open the sidebar.

Setting Your Preferences:
Go to Settings (accessible from your avatar menu in the top-right corner) to change your display language, notification preferences, and theme (light or dark mode).

Support:
If you need help, use the AI Assistant (this feature!) or contact our support team through the Help Centre link in the footer.
    `.trim(),
  },
  {
    title: 'Enrolling in a Course',
    url: '/help/enroll-course',
    content: `
How to Enrol in a Course on Zufishan:

Browsing Courses:
Navigate to the Courses section from the sidebar. You can browse all available courses by category (e.g. Quran Studies, Islamic History, Fiqh Foundations, Arabic Language). Use the search bar to find a specific course by name or topic.

Enrolling:
Open any course card to view the full course detail page. It shows the instructor name, difficulty level, course modules, and a list of lessons. Click the "Enrol Now" button to join the course. Enrolment is instant and free unless the course is a premium marketplace item.

Accessing Course Content:
Once enrolled, return to your Dashboard or the Courses section. Your enrolled courses appear in "My Courses". Click a course to enter the course player, where you can watch video lessons, download resources, and track your progress.

Dropping a Course:
To drop an enrolled course, open the course, click the three-dot menu (⋮) at the top right, and select "Drop Course". Note: dropping a course removes your progress record.

Course Progress:
Your progress percentage is shown on each course card. Progress is updated automatically as you complete lessons. Complete all modules to receive your course completion certificate.
    `.trim(),
  },
  {
    title: 'Using the AI Assistant',
    url: '/help/ai-assistant',
    content: `
The Zufishan AI Assistant is your on-platform guide for everything related to Zufishan features, courses, and the marketplace.

What the AI Assistant can help with:
- Platform navigation ("How do I find my enrolled courses?")
- Course information ("What courses are available in Arabic Language?")
- Marketplace browsing ("What items are in the marketplace?")
- Platform FAQs ("How do I reset my password?")
- Account and settings questions

What the AI Assistant cannot help with:
- Islamic religious rulings (fatwas). For fiqh questions, please use the Scholar Connect feature to reach a qualified Ustadh or Mufti.
- General knowledge questions unrelated to the Zufishan platform.

How to use it:
Access the AI Assistant from the sidebar under Utilities > AI Assistant. Type your question in the chat box and press Enter or click Send. The assistant will respond using verified Zufishan platform information.

Conversation History:
Your previous conversations are saved. Click "History" to view past sessions and continue from where you left off.

Providing Feedback:
After each AI response, you can rate it as Helpful, Not Helpful, or Inappropriate using the thumbs icons. Your feedback helps improve the assistant.
    `.trim(),
  },
  {
    title: 'Prayer Times Feature',
    url: '/help/prayer-times',
    content: `
Prayer Times on Zufishan:

The Prayer Times feature shows the five daily prayer times (Fajr, Dhuhr, Asr, Maghrib, Isha) calculated for your current location.

How to access:
Go to Utilities > Prayer Times from the sidebar.

Location:
The feature uses your browser's geolocation API to detect your coordinates. Click "Allow" when prompted for location access. You can also manually enter your city or coordinates.

Calculation Methods:
Zufishan supports multiple calculation methods including MWL (Muslim World League), ISNA, Egyptian General Authority, and the University of Islamic Sciences, Karachi. Select your preferred method from the Settings dropdown on the Prayer Times page.

Asr Method:
You can switch between the Standard (Shafi'i/Maliki/Hanbali) and Hanafi Asr calculation methods.

Accuracy Note:
Prayer times are approximate calculations based on astronomical formulas. Always verify with your local mosque or Islamic authority for confirmed times, especially during Ramadan.
    `.trim(),
  },
  {
    title: 'Zakat Calculator',
    url: '/help/zakat-calculator',
    content: `
Zufishan Zakat Calculator:

The Zakat Calculator helps you estimate your annual Zakat obligation based on your assets.

How it works:
1. Go to Utilities > Zakat Calculator.
2. Select your madhab (Hanafi, Shafi'i, Maliki, or Hanbali).
3. Enter your asset details: cash savings, gold, silver, business inventory, agricultural produce, investments, and livestock if applicable.
4. The calculator applies the current Nisab threshold to determine if Zakat is due.
5. If your total zakatable assets exceed the Nisab, the calculator shows your Zakat due (2.5% of eligible assets for most categories).

Nisab Rate:
The Nisab threshold is updated regularly based on current gold and silver market prices. You can view the current Nisab rate on the calculator page.

Currency:
The calculator supports multiple currencies. Select your currency from the dropdown before entering asset values.

Note:
This calculator provides an educational estimate only. For definitive Zakat rulings for complex asset situations (business partnerships, joint investments, etc.), please consult a qualified Islamic scholar via the Scholar Connect feature.
    `.trim(),
  },
  {
    title: 'Assignments and Submissions',
    url: '/help/assignments',
    content: `
Assignments on Zufishan:

Instructors can assign coursework to enrolled students. Here is how to manage your assignments.

Viewing Assignments:
Click Assignments in the sidebar to see all your pending, submitted, and graded assignments across all your enrolled courses.

Submitting an Assignment:
1. Click on the assignment title to open it.
2. Read the instructions carefully.
3. Type your response in the text area provided, or upload a file if the assignment requires it.
4. Click Submit. You will see a "Submitted" status badge once your submission is recorded.

Deadlines:
Assignment due dates are shown on each card. Overdue assignments are highlighted in red. Contact your instructor if you need an extension.

Grades and Feedback:
Once your instructor has graded your submission, you will receive a notification. Open the assignment to view your score (out of the maximum points) and the instructor's written feedback.

Resubmission:
Resubmission is not allowed by default. If your instructor permits it, a "Resubmit" button will appear after grading.
    `.trim(),
  },
  {
    title: 'Achievements and Streaks',
    url: '/help/achievements',
    content: `
Achievements and Learning Streaks on Zufishan:

Achievements:
Zufishan awards badges for key milestones on your learning journey. Examples include:
- Perfect Attendance: Attend 10 consecutive live classes.
- First Submission: Submit your first assignment.
- Course Completer: Finish all lessons in a course.
- Streak Champion: Maintain a 30-day learning streak.

View your earned achievements in the Achievements section of the sidebar. Each badge shows the date it was unlocked and the XP points awarded.

Learning Streak:
Your streak represents the number of consecutive days you have been active on the platform (completing a lesson, submitting an assignment, or attending a live class). The streak counter is shown on your Dashboard.

If you miss a day, your streak resets to zero. Log in and complete at least one learning activity daily to maintain your streak.

XP Points:
Each achievement awards XP points which contribute to your overall learner rank on Zufishan.
    `.trim(),
  },
  {
    title: 'Messaging and Communication',
    url: '/help/messaging',
    content: `
Messaging on Zufishan:

Direct Messages:
You can send private messages to other Zufishan users (instructors, fellow students). Go to Messages in the sidebar, click "New Message", search for the recipient by name, and type your message.

Group Channels:
Group discussions are available per course. Your instructors may create course-specific channels for announcements and group study. Access them via the course page > Discussions tab.

Message Notifications:
You will receive an in-app notification badge on the Messages icon when you have unread messages. Enable browser notifications in your settings for real-time alerts.

AI Assistant vs. Messaging:
The AI Assistant (Utilities > AI Assistant) is for platform support questions only. For peer-to-peer communication, use the Messages feature.
    `.trim(),
  },
]
