/**
 * Zufishan Platform — FAQ Corpus
 *
 * Frequently asked questions and answers for ingestion into the RAG knowledge base.
 * Each entry will become its own RAG document (one Q&A = one document).
 *
 * Add new FAQs here and re-run: npx tsx scripts/ingestCorpus.ts
 */

import type { FaqEntry } from '../ingestPipeline'

export const FAQS: FaqEntry[] = [
  {
    question: 'How do I reset my password?',
    answer:
      'To reset your password, click "Forgot Password" on the login page. Enter your registered email address and click Send. You will receive a password reset link within a few minutes. Click the link and set your new password. If you do not receive the email, check your spam folder or contact support.',
  },
  {
    question: 'How do I update my profile information?',
    answer:
      'Click your avatar in the top-right corner and select "Profile" or "Settings". From there you can update your full name, bio, avatar image, and language preference. Click Save to apply changes.',
  },
  {
    question: 'Can I access Zufishan on my phone?',
    answer:
      'Yes. Zufishan is a fully responsive web application that works on smartphones and tablets. Open your mobile browser and navigate to the Zufishan URL. For the best experience, use the latest version of Chrome, Safari, or Firefox.',
  },
  {
    question: 'How do I find courses on a specific topic?',
    answer:
      'Go to the Courses section from the sidebar. Use the search bar at the top to search by keyword (e.g., "Arabic", "Tafsir", "Fiqh"). You can also filter by category using the category tabs. Each course card shows the title, instructor, level, and rating.',
  },
  {
    question: 'How is my learning progress tracked?',
    answer:
      'Your progress is tracked per course as a percentage (0–100%). Progress increases as you complete individual lessons. The progress bar is shown on each course card in "My Courses" and inside the course player. Your overall activity is also reflected in your learning streak on the Dashboard.',
  },
  {
    question: 'What is the Scholar Connect feature?',
    answer:
      'Scholar Connect allows you to reach qualified Islamic scholars (Ustadh / Mufti) for religious guidance, fiqh questions, and fatwa requests. Access it from Utilities > Scholar Connect. The AI Assistant does not answer religious rulings — Scholar Connect is the correct channel for those questions.',
  },
  {
    question: 'How do I contact Zufishan support?',
    answer:
      'You can reach support via: (1) The AI Assistant for platform-related questions. (2) The Help Centre link in the footer for documentation. (3) The Messages feature to contact your instructor directly. For account or billing issues, email support@zufishan.com.',
  },
  {
    question: 'What is the Qibla finder?',
    answer:
      'The Qibla Finder shows the direction of the Kaaba in Makkah relative to your current location. Access it from Utilities > Qibla. Allow location access when prompted. The compass arrow will point toward the Qibla direction. You can also manually enter coordinates if geolocation is unavailable.',
  },
  {
    question: 'What is the Tasbih counter?',
    answer:
      'The Tasbih Counter (Utilities > Tasbih) is a digital dhikr counter. Select your dhikr phrase (e.g., SubhanAllah, Alhamdulillah, Allahu Akbar), set your target count, and tap the counter button each time you recite. Sessions are saved to your history for tracking your dhikr practice over time.',
  },
  {
    question: 'How does the Hijri Date converter work?',
    answer:
      'The Hijri Date tool (Utilities > Hijri Date) shows today\'s date in the Islamic (Hijri) calendar alongside the Gregorian date. You can enter any Gregorian date to see its Hijri equivalent. You can also adjust the calculation by ±1 day to match your local moon-sighting authority.',
  },
  {
    question: 'Are courses on Zufishan free?',
    answer:
      'Most foundational courses on Zufishan are free to enrol in. Some advanced or specialised courses may be available as premium items in the Marketplace. Check the course detail page for any pricing information before enrolling.',
  },
  {
    question: 'How do I view my enrolled courses?',
    answer:
      'Your enrolled courses are visible in two places: (1) The Dashboard shows your active courses with progress bars. (2) The Courses section (sidebar) has a "My Courses" tab listing all your enrollments. Click any course to enter the course player.',
  },
  {
    question: 'Can I download course materials?',
    answer:
      'Some courses include downloadable resources (PDFs, notes). These appear in the course page under the Resources tab. Click the download icon next to any resource file to save it. Video lessons are currently for streaming only and cannot be downloaded.',
  },
  {
    question: 'What is the Calendar feature?',
    answer:
      'The Calendar (sidebar > Calendar) shows all your upcoming events in one place: scheduled classes, assignment due dates, exam dates, and any AI session bookings. Events are colour-coded by type. Click an event to view details or join a live session.',
  },
  {
    question: 'How do I see my assignment grades?',
    answer:
      'Go to Assignments in the sidebar. Graded assignments show a "Graded" badge and your score. Click the assignment to see the full score breakdown and your instructor\'s written feedback. You will also receive a notification when grading is complete.',
  },
  {
    question: 'What languages does Zufishan support?',
    answer:
      'The Zufishan platform interface is currently available in English. Course content may include Arabic, Urdu, and other languages depending on the instructor. You can set your preferred language in Settings > Preferences.',
  },
  {
    question: 'How do I delete my account?',
    answer:
      'Account deletion is permanent and removes all your data including course progress, messages, and achievements. To request deletion, email support@zufishan.com with the subject "Account Deletion Request" from your registered email address. Deletions are processed within 7 business days.',
  },
  {
    question: 'What is the Marketplace?',
    answer:
      'The Zufishan Marketplace is a catalogue of premium educational resources and courses available for purchase or access. Browse it from the sidebar under Marketplace. Each listing shows a title, description, category, and pricing. Contact support if you have questions about a specific item.',
  },
]
