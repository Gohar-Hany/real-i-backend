# REAL_i — Enterprise Backend REST API & Live Collaboration Engine

REAL_i Backend is a production-grade Node.js/Express & MongoDB API that powers the educational LMS, role-based access control (RBAC), multi-format assessments, live classroom gatekeeping, in-class interactive polling, automated attendance synchronization, and AI lecture synthesis.

---

## 🚀 Key Features

- **Authentication & RBAC**: JWT authentication with granular permissions for `admin`, `instructor`, and `student` roles.
- **Course & Learning Engine**: Hierarchical curriculum structure (Courses ➔ Modules ➔ Lessons) with self-enrollment, admin manual enrollment, and real-time student progress tracking.
- **Multi-Type Assessment Engine**:
  - MCQ Quizzes with instant automated grading & security protection (answers hidden from students).
  - Timed Midterms & Final Examinations with state transitions (`draft` ➔ `published`).
  - Capstone Projects & Assignments with URL and file submission support.
  - Manual Rubric Grading with feedback and score overrides.
- **Live Classroom & Meeting Engine**:
  - Single and Batch Recurring sessions generation (multi-week series).
  - Gatekeeper Authorization (`/authorize-join`) verifying student course enrollment.
  - Live In-Class Polling system with duplicate-vote prevention.
  - Real-time Attendance & Learning Minutes synchronization.
  - AI Lecture Companion generating summaries, key takeaways, and action items.
- **Platform Analytics & Consolidated Calendar**: Platform-wide metrics, per-student performance tracking, and event scheduling.

---

## 🛠️ Tech Stack

- **Runtime**: Node.js (ES Modules)
- **Framework**: Express.js
- **Database**: MongoDB Atlas with Mongoose ODM
- **Security**: JWT (jsonwebtoken), bcryptjs, CORS, Helmet
- **Testing**: Built-in comprehensive 56-test Enterprise Suite

---

## 📦 Setup & Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/Gohar-Hany/real-i-backend.git
   cd real-i-backend
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   Copy `.env.example` to `.env` and fill in your credentials:
   ```bash
   cp .env.example .env
   ```

4. **Start Development Server**:
   ```bash
   npm run dev
   # or
   npm start
   ```

5. **Run the Enterprise Test Suite (56/56 PASS)**:
   ```bash
   npm test
   # or
   node tests/test_enterprise_suite.js
   ```
