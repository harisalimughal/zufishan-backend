# Zufishan Backend — Pre-Implementation Architecture Inspection Report

> **Branch:** `Daily_Utilities&AI_Assistant`  
> **Inspected:** 2026-08-23  
> **Purpose:** Full audit before implementing the Daily Utilities & AI Assistant module.  
> **Status:** READ-ONLY INSPECTION — nothing modified.

---

## 1. Architecture Summary

The backend is a **production-grade, layered REST API** built with:

| Layer | Technology |
| :--- | :--- |
| Runtime | Node.js 22 + TypeScript 5.7 |
| Framework | Express 5.1.0 |
| ORM | Prisma 6.2.1 (`@prisma/client`) |
| Database | PostgreSQL (via `DATABASE_URL` + `DIRECT_URL`) |
| Auth | JWT (`jsonwebtoken`) — Access Token (15m) + Refresh Token (7d) |
| Validation | Zod (`zod`) — schema-first, applied via `validate.middleware.ts` |
| Logging | Pino + Pino-Pretty + Morgan HTTP logger |
| Testing | Vitest + Supertest |
| Deployment | `scripts/start.js` → `prisma migrate deploy` → `node dist/server.js` |

**Request flow (every endpoint follows this pattern):**
```
HTTP Request
  → Rate Limiter (express-rate-limit)
  → Security Headers (helmet)
  → Parsing (json / urlencoded / cookies)
  → Logging (morgan → pino)
  → Route (src/routes/*.routes.ts)
      → authenticate (JWT check) [if protected]
      → requireAdmin (role check) [if admin-only]
      → validate(zodSchema) [if body/params/query validation needed]
      → Controller (src/controllers/*.controller.ts)
          → Service (src/services/*.service.ts)
              → Repository (src/repositories/*.repository.ts)
                  → Prisma (src/config/prisma.ts)
                      → PostgreSQL
  → errorHandler (catches ApiError, Zod errors, Prisma panics)
```

---

## 2. Confirmed File Tree

```text
Zufishan-Backend/
├── prisma/
│   ├── schema.prisma               ✅ 6 domain modules, 20+ models, full enums
│   ├── migrations/
│   │   └── 20260806151802_course_module/  ✅ 1 production migration applied
│   ├── seed.ts                     ✅ Admin + demo course seeder
│   ├── seedData.ts                 ✅ Course/module/lesson seed data
│   ├── checkUser.ts                ℹ️  Dev utility — checks a user in DB
│   ├── testAllApis.ts              ℹ️  Dev utility — HTTP smoke tests
│   └── testProfileUpdate.ts       ℹ️  Dev utility — profile update test
├── src/
│   ├── server.ts                   ✅ Entry point, graceful shutdown, PORT=4000
│   ├── app.ts                      ✅ Express setup, CORS, rate limit, /health, /ready
│   ├── config/
│   │   ├── env.ts                  ✅ Zod-validated env (NODE_ENV, PORT, CLIENT_URL, DATABASE_URL, JWT_SECRET, JWT_EXPIRES_IN)
│   │   └── prisma.ts               ✅ Singleton PrismaClient + checkDatabaseHealth()
│   ├── routes/
│   │   ├── index.ts                ✅ Central router — all 16 route files mounted under /api
│   │   ├── auth.routes.ts          ✅ /auth (register, login, refresh, logout, me, change-password, forgot/reset-password)
│   │   ├── admin.routes.ts         ✅ /admin (protected — requireAdmin)
│   │   ├── course.routes.ts        ✅ /courses
│   │   ├── courseModule.routes.ts  ✅ /courses/:courseId/modules
│   │   ├── lesson.routes.ts        ✅ /modules/:moduleId/lessons
│   │   ├── courseResource.routes.ts ✅ /courses/:courseId/resources
│   │   ├── assignment.routes.ts    ✅ /assignments
│   │   ├── submission.routes.ts    ✅ /submissions
│   │   ├── enrollment.routes.ts    ✅ /enrollments
│   │   ├── attendance.routes.ts    ✅ /attendance
│   │   ├── achievement.routes.ts   ✅ /achievements
│   │   ├── calendarEvent.routes.ts ✅ /calendar-events
│   │   ├── message.routes.ts       ✅ /messages
│   │   ├── groupMessage.routes.ts  ✅ /group-messages
│   │   └── user.routes.ts          ✅ /users
│   ├── controllers/                ✅ 15 controllers — one per domain
│   ├── services/                   ✅ 14 services — business logic per domain
│   ├── repositories/               ✅ 14 repositories — Prisma query layer per domain
│   ├── middlewares/
│   │   ├── auth.middleware.ts       ✅ authenticate() — Bearer token → req.user
│   │   ├── admin.middleware.ts      ✅ requireAdmin() — checks req.user.role === 'ADMIN'
│   │   ├── validate.middleware.ts   ✅ validate(schema, source) — body/params/query
│   │   ├── error.middleware.ts      ✅ Handles ApiError, JWT errors, Prisma panic reconnect
│   │   └── notFound.middleware.ts   ✅ 404 catch-all
│   ├── validators/
│   │   ├── auth.validator.ts        ✅ registerSchema, loginSchema, refreshTokenSchema, etc.
│   │   ├── assignment.validator.ts  ✅
│   │   ├── attendance.validator.ts  ✅
│   │   ├── user.validator.ts        ✅
│   │   ├── enrollment.validator.ts  ✅
│   │   ├── courseResource.validator.ts ✅
│   │   ├── achievement.validator.ts ✅
│   │   └── course.validator.ts      ⚠️  Empty file (0 bytes) — potential oversight
│   ├── utils/
│   │   ├── apiError.ts             ✅ ApiError class with static helpers (badRequest, notFound, forbidden, etc.)
│   │   ├── asyncHandler.ts         ✅ Wraps async controllers — passes errors to errorHandler
│   │   ├── jwt.ts                  ✅ generateToken (15m), generateRefreshToken (7d), verifyToken, verifyRefreshToken
│   │   ├── logger.ts               ✅ Pino structured logger
│   │   └── password.ts             ✅ bcryptjs hash/compare utilities
│   └── types/
│       ├── express.d.ts            ⚠️  TODO noted inside — req.user type augmentation is incomplete (cast as `any` in middleware)
│       └── index.ts                ℹ️  Minimal shared types
├── tests/
│   ├── courseResource.test.ts      ✅ Full Vitest + Supertest integration test
│   └── user.test.ts                ⚠️  Mostly empty (188 bytes) — placeholder
├── scripts/
│   └── start.js                    ✅ Production boot: prisma migrate deploy → node dist/server.js
├── .env.example                    ✅ DATABASE_URL, JWT_SECRET, PORT, CLIENT_URL documented
├── package.json                    ✅ Scripts: dev, build, start, test, prisma:push, prisma:studio
├── tsconfig.json                   ✅ Strict TypeScript targeting Node
└── vitest.config.ts                ✅ Vitest test runner configured
```

---

## 3. Identified Issues / Flags

| # | File | Issue | Risk |
| :--- | :--- | :--- | :--- |
| 1 | `src/validators/course.validator.ts` | File exists but is 0 bytes (empty). Course routes may be unvalidated. | Medium |
| 2 | `src/types/express.d.ts` | `req.user` is typed as `any` via cast in `auth.middleware.ts`, not via proper global type augmentation. | Low-Medium |
| 3 | `tests/user.test.ts` | Only a stub (188 bytes). User endpoints have no automated test coverage. | Low |
| 4 | `src/server.ts` startup banner | References "Ranenla Backend Server" — old project name, not "Noor Ilm / Zufishan". | Cosmetic |
| 5 | `schema.prisma` | References `DIRECT_URL` env var — not listed in `.env.example`. Required for Supabase/PgBouncer setups. | Medium |

---

## 4. Frontend Architecture Confirmed

| Area | Technology / Implementation |
| :--- | :--- |
| Framework | Next.js 16 (App Router) + React 19 + TypeScript |
| Styling | Tailwind CSS v4 (`@import "tailwindcss"`) |
| Animations | **Framer Motion** (v12) — used in `ComingSoon`, `SplashScreen` |
| Icons | Lucide React |
| Charts | Recharts |
| Auth | Custom `AuthContext.tsx` with `AUTH_DISABLED=true` flag (mock mode currently active) |
| API Client | Custom `lib/apiClient.ts` (native `fetch`) — base URL `NEXT_PUBLIC_API_URL` → `http://localhost:4000/api` |
| State Management | React Context (AuthContext, ThemeContext) — **NO React Query installed** |
| Routing | Next.js App Router, `(dashboard)` route group |
| Navigation | `lib/navigation/sidebar-items.ts` — typed `SidebarSection[]` array |
| Services | `apps/platform/services/*.ts` — thin wrappers over `apiClient` |
| Mock Data | `apps/platform/mock-data/*.ts` — all stubs (12 bytes each), not yet populated |
| Design Tokens | `globals.css` — Zufishan brand green (`--color-primary-500: #10b981`), dark scrollbars |
| Testing | No frontend test setup found |
| Docker | No `Dockerfile` or `docker-compose.yml` found in either repo |

---

## 5. Where the Utilities Module Integrates

### Backend Integration Points
- **Schema**: `prisma/schema.prisma` — add new utility-specific models (e.g. `AzkarItem`, `ZakatLog`, `AiUtilityConversation`).
- **Routes Index**: `src/routes/index.ts` — register `/utilities` or individual feature routes.
- **Pattern to follow**: Every existing feature has a matching quadruplet: `validator → controller → service → repository`.

### Frontend Integration Points
- **Sidebar Nav**: `apps/platform/lib/navigation/sidebar-items.ts` — add new `"Utilities"` section with sub-items.
- **Routes**: `apps/platform/app/(dashboard)/` — create new page directories for each utility.
- **Features**: `apps/platform/features/` — create `utilities/` sub-folder per feature.
- **Services**: `apps/platform/services/` — create `utilityService.ts` calling `apiClient`.
- **Shared Components**: Reuse `ComingSoon` (Framer Motion animated), `PlatformLayout` wrapping, and Lucide icons.
- **Design Tokens**: Reuse `--color-primary` green (`#10b981`) and dark theme patterns from `globals.css`.

---

## 6. Files to Reuse (Do NOT recreate)

**Backend:**
- `src/middlewares/auth.middleware.ts` — `authenticate` — attach to all protected utility routes.
- `src/middlewares/validate.middleware.ts` — `validate(schema)` — attach to all routes with body input.
- `src/middlewares/error.middleware.ts` — already handles all error types globally.
- `src/utils/apiError.ts` — `ApiError.notFound()`, `ApiError.badRequest()` etc. — use in services.
- `src/utils/asyncHandler.ts` — wrap every controller function.
- `src/config/prisma.ts` — import `prisma` singleton directly.

**Frontend:**
- `lib/apiClient.ts` — `apiClient.get()`, `apiClient.post()` etc.
- `context/AuthContext.tsx` — `useAuth()` hook to access current user.
- `components/ComingSoon/ComingSoon.tsx` — placeholder for unbuilt utility pages.
- `components/PlatformLayout/` — all utility pages are wrapped automatically by `(dashboard)/layout.tsx`.

---

## 7. Files to Create

### Backend — New Files
```text
prisma/schema.prisma                         (MODIFY — add utility models)
src/routes/utility.routes.ts                 (CREATE)
src/routes/index.ts                          (MODIFY — register utility routes)
src/controllers/utility.controller.ts        (CREATE — one per utility or grouped)
src/services/utility.service.ts              (CREATE)
src/repositories/utility.repository.ts      (CREATE)
src/validators/utility.validator.ts          (CREATE)
```

### Frontend — New Files
```text
apps/platform/lib/navigation/sidebar-items.ts         (MODIFY — add Utilities section)
apps/platform/app/(dashboard)/prayer-times/page.tsx   (CREATE)
apps/platform/app/(dashboard)/qibla/page.tsx          (CREATE)
apps/platform/app/(dashboard)/zakat/page.tsx          (CREATE)
apps/platform/app/(dashboard)/azkar/page.tsx          (CREATE)
apps/platform/app/(dashboard)/ai-assistant/page.tsx   (CREATE)
apps/platform/features/utilities/                     (CREATE — component folder)
apps/platform/services/utilityService.ts              (CREATE)
```

---

## 8. Possible Conflicts & Dependencies

| Conflict / Dependency | Description |
| :--- | :--- |
| **`AUTH_DISABLED=true`** in `AuthContext.tsx` | All API calls from utility pages will use a mock token. Utility API routes that call `authenticate` middleware will reject with 401 unless backend is running with an actual user session. Keep mock mode until backend is wired up. |
| **No React Query** | There is no `@tanstack/react-query` installed. Data fetching in new utility pages must use `useEffect + apiClient` pattern (consistent with existing services), or React Query can be installed intentionally as a new dependency. |
| **`DIRECT_URL` not in `.env.example`** | If the database uses Supabase/PgBouncer, `DIRECT_URL` must be set in the actual `.env`. Schema migrations will silently fail otherwise. |
| **Empty `course.validator.ts`** | Do not reference this as a pattern — it is empty. Use `auth.validator.ts` as the validator pattern template. |
| **`req.user` typed as `any`** | Before writing utility controllers that read `req.user.id` or `req.user.role`, the type augmentation in `src/types/express.d.ts` should be completed to avoid `any` type propagation. |

---

## 9. Recommended Implementation Order

### Phase 1 — Backend Foundation
1. Fix `src/types/express.d.ts` — properly type `req.user` globally.
2. Add utility Prisma models to `prisma/schema.prisma`.
3. Run `npx prisma migrate dev --name utilities_module`.
4. Create `src/validators/utility.validator.ts`.
5. Create `src/repositories/utility.repository.ts`.
6. Create `src/services/utility.service.ts`.
7. Create `src/controllers/utility.controller.ts`.
8. Create `src/routes/utility.routes.ts`.
9. Register in `src/routes/index.ts`.

### Phase 2 — Frontend Integration
1. Add `"Utilities"` section to `sidebar-items.ts`.
2. Create feature component folder `apps/platform/features/utilities/`.
3. Create `apps/platform/services/utilityService.ts`.
4. Build page routes one utility at a time under `app/(dashboard)/`.
5. Wire `utilityService` calls into components.
6. Replace `ComingSoon` stubs with real feature components as they are completed.

### Phase 3 — Connect & Test
1. Set `AUTH_DISABLED=false` in `AuthContext.tsx` when backend is confirmed running.
2. Verify API responses match frontend service types.
3. Add Vitest integration tests for new utility routes in `tests/`.

---

## 5. Utilities Module — Database Schema (Added 2026-08-24)

**Migration file:** `prisma/migrations/20260824000000_utilities_module/migration.sql`

Yeh section explain karta hai ke humne Utilities module ke liye PostgreSQL mein kaun se naye tables banaye hain. Koi bhi purana table change nahi kiya gaya — sirf naye tables add kiye gaye hain.

---

### 2 Naye Enums

| Enum | Values | Use |
| :--- | :--- | :--- |
| `AzkarCategory` | MORNING, EVENING, SLEEP, PRAYER, GENERAL | Azkar category type |
| `AiAssistantRole` | USER, ASSISTANT | AI chat message sender |

---

### Table-by-Table Explanation

#### 1. `prayer_time_cache`
- **Kya karta hai:** Prayer times ko cache karta hai taake har baar API call na karna pade.
- **Unique constraint:** Ek hi location + date + method ka sirf ek row hoga.
- **`latitude` / `longitude`:** `DECIMAL(9,6)` — float rounding errors se bachne ke liye.
- **`expiresAt` index:** Cache cleanup jobs ke liye.

#### 2. `zakat_nisab_rates`
- **Kya karta hai:** Gold aur silver ki price per gram store karta hai (Nisab threshold ke liye).
- **Admin managed:** Scheduled job ya admin data enter karta hai.
- **`DECIMAL(18,6)`:** Financial calculations ke liye exact precision.
- **Unique:** Ek currency ka ek din ka sirf ek rate allowed hai.

#### 3. `zakat_calculations`
- **Kya karta hai:** User ki Zakat calculation ka result save karta hai.
- **`userId` nullable:** Guest user bhi calculate kar sakta hai bina account ke.
- **All asset fields `DECIMAL`:** Paise wali fields kabhi float nahi honi chahiye.

#### 4. `azkar_categories`
- **Kya karta hai:** Azkar ke groups define karta hai — morning, evening, sleep, etc.
- **`slug` unique:** URL-friendly identifier — e.g. `"morning"`.
- **`displayOrder`:** Frontend pe categories ordered sequence mein dikhane ke liye.

#### 5. `azkar_items`
- **Kya karta hai:** Individual azkar / duas store karta hai.
- **FK to categories (CASCADE):** Category delete hone par items bhi delete ho jate hain.
- **`repetitions`:** Kitni baar padhna hai — default 33.
- **`audioUrl`:** Optional audio URL agar audio feature future mein add karna ho.

#### 6. `tasbih_sessions`
- **Kya karta hai:** User ke dhikr counter sessions save karta hai.
- **`sessionDate` DATE:** Sirf date — daily history efficiently fetch karne ke liye.
- **Composite index `(userId, sessionDate)`:** Per-user daily lookup fast karta hai.

#### 7. `ai_assistant_conversations`
- **Kya karta hai:** AI assistant ke conversation threads manage karta hai.
- **`isActive`:** Purane conversations archive karne ke liye.
- **Learning Platform se ALAG:** `ai_chat_messages` (tutor feature) se bilkul alag table.

#### 8. `ai_assistant_logs`
- **Kya karta hai:** Conversation ke andar har message (user ya AI) store karta hai.
- **`promptTokens`, `completionTokens`, `totalTokens`:** AI API cost tracking.
- **`modelUsed`:** Kaunsa AI model use hua — e.g. `"gemini-1.5-flash"`.
- **`latencyMs`:** Response time — performance monitoring ke liye.
- **Composite index `(conversationId, createdAt)`:** Chronological history fetch ke liye efficient.

---

### Migration Chalane Ka Tarika (Jab DB Connected Ho)
```bash
# .env mein DATABASE_URL aur DIRECT_URL set karo, phir:
npx prisma migrate deploy    # production ke liye
npx prisma migrate dev       # development ke liye
```

