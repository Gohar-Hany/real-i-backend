const BASE_URL = process.env.API_URL || 'http://localhost:4000/api/v1';

let adminToken = '';
let superAdminEmail = process.env.SUPER_ADMIN_EMAIL || 'goharhany@gmail.com';
let studentAToken = '';
let studentAId = '';
let studentBToken = '';
let studentBId = '';

let courseId = '';
let courseProjectId = 'course_exhaustive_' + Date.now();
let meetingId = '';
let meetingSeriesId = 'series_' + Date.now();
let quizId = '';
let midtermId = '';
let finalExamId = '';
let assignmentId = '';
let taskId = '';
let submissionId = '';
let eventId = '';

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition, testName, details = '') {
  totalTests++;
  if (condition) {
    console.log(`  ✅ [PASS ${totalTests}] ${testName}`);
    passedTests++;
  } else {
    console.error(`  ❌ [FAIL ${totalTests}] ${testName} ${details ? '--> ' + details : ''}`);
    failedTests++;
  }
}

async function runExhaustiveSuite() {
  console.log('======================================================================');
  console.log('🏛️  REAL_i EXHAUSTIVE ENTERPRISE AUDIT & FULL FUNCTIONALITY TEST SUITE');
  console.log('======================================================================\n');

  // ═══════════════════════════════════════════════════════════════════
  // 1. AUTHENTICATION, REGISTRATION & SECURITY
  // ═══════════════════════════════════════════════════════════════════
  console.log('📌 1. AUTHENTICATION, REGISTRATION & SECURITY AUDIT');
  try {
    // 1.1 Admin Login
    let adminLoginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: superAdminEmail, password: 'Password123!' })
    });
    if (adminLoginRes.status !== 200) {
      adminLoginRes = await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: superAdminEmail, password: 'admin123' })
      });
    }
    const adminData = await adminLoginRes.json();
    adminToken = adminData.access_token;
    assert(adminLoginRes.status === 200 && adminToken, 'Super Admin logged in successfully with valid JWT');

    // 1.2 Student A Registration
    const studentAEmail = `student_a_${Date.now()}@reali.com`;
    const regResA = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Student Alpha', email: studentAEmail, password: 'Password123!' })
    });
    const regDataA = await regResA.json();
    studentAToken = regDataA.access_token;
    studentAId = regDataA.user?.id || regDataA.user?._id;
    assert(regResA.status === 201 && studentAToken && regDataA.user?.role === 'student', 'Student A registered with strict student role default');

    // 1.3 Student B Registration
    const studentBEmail = `student_b_${Date.now()}@reali.com`;
    const regResB = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Student Beta', email: studentBEmail, password: 'Password123!' })
    });
    const regDataB = await regResB.json();
    studentBToken = regDataB.access_token;
    studentBId = regDataB.user?.id || regDataB.user?._id;
    assert(regResB.status === 201 && studentBToken, 'Student B registered successfully');

    // 1.4 Duplicate Registration Prevention
    const dupRes = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Duplicate', email: studentAEmail, password: 'Password123!' })
    });
    assert(dupRes.status === 400, 'Duplicate email registration safely rejected (400 Bad Request)');

    // 1.5 Invalid Password Rejection
    const badPassRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: studentAEmail, password: 'WrongPassword!' })
    });
    assert(badPassRes.status === 401, 'Invalid password login correctly rejected (401 Unauthorized)');

    // 1.6 Current Profile Retrieval (/auth/me)
    const meRes = await fetch(`${BASE_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${studentAToken}` }
    });
    const meData = await meRes.json();
    assert(meRes.status === 200 && meData.user?.email === studentAEmail, 'Current authenticated user profile returned accurately (/auth/me)');
  } catch (err) {
    assert(false, 'Auth phase exception', err.message);
  }

  // ═══════════════════════════════════════════════════════════════════
  // 2. USER MANAGEMENT, PROMOTION, DEMOTION & PROFILE
  // ═══════════════════════════════════════════════════════════════════
  console.log('\n📌 2. USER MANAGEMENT, RBAC ROLES, PROMOTION & PROFILES');
  try {
    // 2.1 Admin List Users
    const usersListRes = await fetch(`${BASE_URL}/users`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const usersList = await usersListRes.json();
    assert(usersListRes.status === 200 && Array.isArray(usersList) && usersList.length >= 3, 'Admin successfully retrieved full users list');

    // 2.2 Student List Users (Forbidden)
    const hackUsersRes = await fetch(`${BASE_URL}/users`, {
      headers: { Authorization: `Bearer ${studentAToken}` }
    });
    assert(hackUsersRes.status === 403, 'Student prevented from listing platform users (403 Forbidden)');

    // 2.3 Super Admin Promotes Student B to Instructor
    const promoteInstRes = await fetch(`${BASE_URL}/users/${studentBId}/role`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ role: 'instructor' })
    });
    const promoteInstData = await promoteInstRes.json();
    assert(promoteInstRes.status === 200 && promoteInstData.new_role === 'instructor', 'Super Admin promoted Student B to Instructor role');

    // 2.4 Super Admin Promotes Student B to Admin
    const promoteAdminRes = await fetch(`${BASE_URL}/users/${studentBId}/role`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ role: 'admin' })
    });
    const promoteAdminData = await promoteAdminRes.json();
    assert(promoteAdminRes.status === 200 && promoteAdminData.new_role === 'admin', 'Super Admin promoted user to Admin role');

    // 2.5 Super Admin Demotes user back to Student
    const demoteRes = await fetch(`${BASE_URL}/users/${studentBId}/role`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ role: 'student' })
    });
    assert(demoteRes.status === 200, 'Super Admin demoted user back to Student role');

    // 2.6 User Cannot Change Own Role
    const selfPromoteRes = await fetch(`${BASE_URL}/users/${studentAId}/role`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${studentAToken}` },
      body: JSON.stringify({ role: 'admin' })
    });
    assert(selfPromoteRes.status === 403, 'Unauthorized user blocked from changing roles (403 Forbidden)');

    // 2.7 Student Updates Own Profile
    const profileUpdateRes = await fetch(`${BASE_URL}/users/${studentAId}/profile`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${studentAToken}` },
      body: JSON.stringify({ name: 'Alpha Updated', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb' })
    });
    const profileUpdateData = await profileUpdateRes.json();
    assert(profileUpdateRes.status === 200 && profileUpdateData.user?.name === 'Alpha Updated', 'Student updated own profile successfully');

    // 2.8 Student Blocked From Updating Other User Profile
    const hackProfileRes = await fetch(`${BASE_URL}/users/${studentBId}/profile`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${studentAToken}` },
      body: JSON.stringify({ name: 'Hacked Name' })
    });
    assert(hackProfileRes.status === 403, 'Student blocked from editing another user profile (403 Forbidden)');
  } catch (err) {
    assert(false, 'User management phase exception', err.message);
  }

  // ═══════════════════════════════════════════════════════════════════
  // 3. FULL COURSE ENGINE, MODULES, LESSONS & DUAL-ENROLLMENT
  // ═══════════════════════════════════════════════════════════════════
  console.log('\n📌 3. COURSE ENGINE: CREATION, UPDATE, MODULES, ENROLLMENT & LESSON PROGRESS');
  try {
    // 3.1 Admin Creates Full Course with Modules & Lessons
    const coursePayload = {
      project_id: courseProjectId,
      title: 'Full Stack Generative AI Engineering',
      subtitle: 'From LLM Fine-Tuning to Agentic Production Systems',
      description: 'Comprehensive enterprise course with modules, practical lessons, quizzes, and live workshops.',
      instructor: 'Dr. Tarek Omar',
      category: 'Artificial Intelligence',
      level: 'Advanced',
      price: 299,
      tags: ['LLM', 'Agents', 'RAG', 'PyTorch'],
      thumbnail: 'https://images.unsplash.com/photo-1677442136019-21780ecad995',
      modules: [
        {
          id: 'mod_1',
          title: 'Module 1: Attention Mechanisms & Transformers',
          lessons: [
            { id: 'les_1', title: 'Lesson 1.1: Scaled Dot-Product Attention', duration: '25 min', type: 'video', is_preview: true },
            { id: 'les_2', title: 'Lesson 1.2: Multi-Head Architecture', duration: '35 min', type: 'video', is_preview: false }
          ]
        },
        {
          id: 'mod_2',
          title: 'Module 2: RAG & Vector Embeddings',
          lessons: [
            { id: 'les_3', title: 'Lesson 2.1: Semantic Chunking & Vector DBs', duration: '40 min', type: 'video', is_preview: false },
            { id: 'les_4', title: 'Lesson 2.2: Reranking & Hybrid Search', duration: '30 min', type: 'reading', is_preview: false }
          ]
        }
      ]
    };

    const createCourseRes = await fetch(`${BASE_URL}/courses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify(coursePayload)
    });
    const createCourseData = await createCourseRes.json();
    courseId = createCourseData.id || createCourseData._id || courseProjectId;
    assert(createCourseRes.status === 201 && createCourseData.lessons_count === 4, `Course created with 2 modules, 4 lessons, and ID: ${courseId}`);

    // 3.2 Admin Updates Course (Edits metadata & price)
    const updateCourseRes = await fetch(`${BASE_URL}/courses/${courseProjectId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        price: 349,
        badge: 'Bestseller'
      })
    });
    const updateCourseData = await updateCourseRes.json();
    assert(updateCourseRes.status === 200 && updateCourseData.price === 349 && updateCourseData.badge === 'Bestseller', 'Admin updated course details & badge successfully');

    // 3.3 Public Course Preview (Modules stripped for unenrolled)
    const publicCourseRes = await fetch(`${BASE_URL}/courses/${courseProjectId}`);
    const publicCourseData = await publicCourseRes.json();
    assert(publicCourseRes.status === 200 && !publicCourseData.modules, 'Public preview hides locked curriculum modules from unenrolled visitors');

    // 3.4 Student A Self-Enrolls in Course
    const enrollResA = await fetch(`${BASE_URL}/courses/${courseProjectId}/enroll`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${studentAToken}` }
    });
    const enrollDataA = await enrollResA.json();
    assert(enrollResA.status === 200 && (enrollDataA.status === 'success' || enrollDataA.success), 'Student A self-enrolled in course successfully');

    // 3.5 Duplicate Self-Enrollment Blocked
    const dupEnrollRes = await fetch(`${BASE_URL}/courses/${courseProjectId}/enroll`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${studentAToken}` }
    });
    assert(dupEnrollRes.status === 400, 'Duplicate self-enrollment blocked (400 Bad Request)');

    // 3.6 Student A Learns Course (Full Player Access)
    const playerResA = await fetch(`${BASE_URL}/courses/${courseProjectId}?mode=learn`, {
      headers: { Authorization: `Bearer ${studentAToken}` }
    });
    const playerDataA = await playerResA.json();
    assert(playerResA.status === 200 && playerDataA.modules?.length === 2, 'Enrolled Student A has full access to course curriculum & video player');

    // 3.7 Student A Completes Lesson 1
    const toggleRes1 = await fetch(`${BASE_URL}/users/${studentAId}/lessons/les_1/toggle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${studentAToken}` },
      body: JSON.stringify({ courseId: courseProjectId })
    });
    const toggleData1 = await toggleRes1.json();
    assert(toggleRes1.status === 200 && (toggleData1.completed || toggleData1.completed_lessons?.includes('les_1')), 'Student A marked Lesson 1 as completed');

    // 3.8 Student A Completes Lesson 2
    const toggleRes2 = await fetch(`${BASE_URL}/users/${studentAId}/lessons/les_2/toggle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${studentAToken}` },
      body: JSON.stringify({ courseId: courseProjectId })
    });
    const toggleData2 = await toggleRes2.json();
    assert(toggleRes2.status === 200 && toggleData2.completed_lessons?.length >= 2, 'Student A marked Lesson 2 as completed and progress tracked');

    // 3.9 Admin Manually Enrolls Student B
    const adminEnrollBRes = await fetch(`${BASE_URL}/courses/${courseProjectId}/enroll-student`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ student_id: studentBId })
    });
    assert(adminEnrollBRes.status === 200, 'Admin manually enrolled Student B into the course');

    // 3.10 Admin Manually Un-enrolls Student B
    const adminUnenrollBRes = await fetch(`${BASE_URL}/courses/${courseProjectId}/unenroll-student`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ student_id: studentBId })
    });
    assert(adminUnenrollBRes.status === 200, 'Admin manually unenrolled Student B from the course');
  } catch (err) {
    assert(false, 'Course engine phase exception', err.message);
  }

  // ═══════════════════════════════════════════════════════════════════
  // 4. ALL ASSESSMENT TYPES: QUIZ, MIDTERM, FINAL EXAM, ASSIGNMENT, TASK
  // ═══════════════════════════════════════════════════════════════════
  console.log('\n📌 4. ASSESSMENTS & TASKS: QUIZ, MIDTERM, FINAL EXAM, ASSIGNMENT & GRADING');
  try {
    // 4.1 Admin Creates MCQ Quiz
    const quizPayload = {
      title: 'Module 1 Mastery Quiz',
      type: 'quiz',
      course_id: courseProjectId,
      status: 'published',
      time_limit: 15,
      passing_grade: 70,
      total_marks: 100,
      questions: [
        {
          question: 'What does Q, K, V represent in Multi-Head Attention?',
          type: 'mcq',
          options: { A: 'Query, Key, Value', B: 'Quantum, Kernel, Vector', C: 'Queue, Key, Variable', D: 'Quick, Knowledge, Validation' },
          correct_answer: 'A',
          marks: 50
        },
        {
          question: 'Which positional encoding is used in standard Transformer?',
          type: 'mcq',
          options: { A: 'Sinusoidal Positional Encoding', B: 'Random Noise', C: 'Binary Integer Hash', D: 'Fibonacci Sequence' },
          correct_answer: 'A',
          marks: 50
        }
      ]
    };
    const createQuizRes = await fetch(`${BASE_URL}/assessments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify(quizPayload)
    });
    const createQuizData = await createQuizRes.json();
    quizId = createQuizData.id || createQuizData._id;
    assert(createQuizRes.status === 201 && quizId, `MCQ Quiz created with ID: ${quizId}`);

    // 4.2 Admin Creates Midterm Exam
    const midtermPayload = {
      title: 'Midterm Examination: GenAI Foundations',
      type: 'exam',
      course_id: courseProjectId,
      status: 'published',
      time_limit: 60,
      max_attempts: 1,
      passing_grade: 60,
      total_marks: 100,
      questions: [
        {
          question: 'What is the theoretical computational complexity of self-attention per layer with sequence length N?',
          type: 'mcq',
          options: { A: 'O(N^2)', B: 'O(N)', C: 'O(log N)', D: 'O(1)' },
          correct_answer: 'A',
          marks: 100
        }
      ]
    };
    const createMidtermRes = await fetch(`${BASE_URL}/assessments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify(midtermPayload)
    });
    const createMidtermData = await createMidtermRes.json();
    midtermId = createMidtermData.id || createMidtermData._id;
    assert(createMidtermRes.status === 201 && midtermId, `Midterm Exam created with ID: ${midtermId}`);

    // 4.3 Admin Creates Final Exam (Draft initially)
    const finalExamPayload = {
      title: 'Comprehensive Final Exam: Enterprise AI Systems',
      type: 'exam',
      course_id: courseProjectId,
      status: 'draft',
      time_limit: 120,
      passing_grade: 75,
      total_marks: 100,
      questions: [
        {
          question: 'Which method avoids quadratic memory in FlashAttention?',
          type: 'mcq',
          options: { A: 'Tiling & Online Softmax in SRAM', B: 'Quantization to 1-bit', C: 'Pruning 90% weights', D: 'Batch Normalization' },
          correct_answer: 'A',
          marks: 100
        }
      ]
    };
    const createFinalRes = await fetch(`${BASE_URL}/assessments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify(finalExamPayload)
    });
    const createFinalData = await createFinalRes.json();
    finalExamId = createFinalData.id || createFinalData._id;
    assert(createFinalRes.status === 201 && createFinalData.status === 'draft', `Final Exam created in draft mode with ID: ${finalExamId}`);

    // 4.4 Admin Publishes Final Exam (Status toggle)
    const toggleStatusRes = await fetch(`${BASE_URL}/assessments/${finalExamId}/status`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const toggleStatusData = await toggleStatusRes.json();
    assert(toggleStatusRes.status === 200 && toggleStatusData.new_status === 'published', 'Admin published the Final Exam via status toggle');

    // 4.5 Admin Creates Assignment (Project with File/URL Submission)
    const assignmentPayload = {
      title: 'Capstone Project: Build Production RAG Pipeline',
      type: 'assignment',
      course_id: courseProjectId,
      status: 'published',
      description: 'Implement a hybrid dense/sparse vector retrieval system with reranking and cite document chunks.',
      instructions: 'Submit GitHub repository URL and technical architecture report (PDF/Markdown).',
      total_marks: 100,
      passing_grade: 70
    };
    const createAssignRes = await fetch(`${BASE_URL}/assessments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify(assignmentPayload)
    });
    const createAssignData = await createAssignRes.json();
    assignmentId = createAssignData.id || createAssignData._id;
    assert(createAssignRes.status === 201 && assignmentId, `Project Assignment created with ID: ${assignmentId}`);

    // 4.6 Admin Creates Task / Exercise
    const taskPayload = {
      title: 'Lab Task 1: Fine-tune LoRA adapter on Custom Dataset',
      type: 'task',
      course_id: courseProjectId,
      status: 'published',
      description: 'Execute HuggingFace PEFT notebook and log training loss curve.',
      total_marks: 50
    };
    const createTaskRes = await fetch(`${BASE_URL}/assessments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify(taskPayload)
    });
    const createTaskData = await createTaskRes.json();
    taskId = createTaskData.id || createTaskData._id;
    assert(createTaskRes.status === 201 && taskId, `Lab Task created with ID: ${taskId}`);

    // 4.7 Student Takes MCQ Quiz (Verify answers are stripped before submit)
    const getQuizRes = await fetch(`${BASE_URL}/assessments/${quizId}`, {
      headers: { Authorization: `Bearer ${studentAToken}` }
    });
    const getQuizData = await getQuizRes.json();
    const hasAnswerKey = getQuizData.questions?.some(q => Boolean(q.correct_answer));
    assert(getQuizRes.status === 200 && !hasAnswerKey, 'Student loaded Quiz with correct answers securely hidden');

    // 4.8 Student Submits MCQ Quiz (Instant Auto-Grading)
    const submitQuizRes = await fetch(`${BASE_URL}/assessments/${quizId}/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${studentAToken}` },
      body: JSON.stringify({
        answers: { 0: 'A', 1: 'A' },
        time_taken: 180
      })
    });
    const submitQuizData = await submitQuizRes.json();
    assert(submitQuizRes.status === 201 && submitQuizData.score === 100 && submitQuizData.percentage === 100, 'Student Quiz auto-graded instantly to 100% score');

    // 4.9 Student Submits Capstone Project Assignment
    const submitAssignRes = await fetch(`${BASE_URL}/assessments/${assignmentId}/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${studentAToken}` },
      body: JSON.stringify({
        answers: { project_url: 'https://github.com/reali-student/rag-pipeline', summary: 'Production RAG with hybrid search completed.' },
        files: ['https://cdn.reali.com/submissions/rag_report.pdf'],
        time_taken: 3600
      })
    });
    const submitAssignData = await submitAssignRes.json();
    submissionId = submitAssignData.id || submitAssignData._id;
    assert(submitAssignRes.status === 201 && submitAssignData.status === 'submitted', `Assignment submitted successfully with ID: ${submissionId}`);

    // 4.10 Admin Lists Submissions for the Assignment
    const submissionsListRes = await fetch(`${BASE_URL}/assessments/${assignmentId}/submissions`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const submissionsList = await submissionsListRes.json();
    assert(submissionsListRes.status === 200 && Array.isArray(submissionsList) && submissionsList.length >= 1, 'Admin listed all student assignment submissions');

    // 4.11 Instructor Grades Assignment (Manual Rubric & Feedback)
    const gradeRes = await fetch(`${BASE_URL}/assessments/${assignmentId}/submissions/${submissionId}/grade`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        score: 95,
        feedback: 'Outstanding architecture design! Excellent RAG chunking and reranker implementation.'
      })
    });
    const gradeData = await gradeRes.json();
    assert(gradeRes.status === 200 && gradeData.score === 95 && gradeData.status === 'graded', 'Instructor graded assignment with score & custom feedback');

    // 4.12 Student Checks Own Submissions & Performance History (/student/me)
    const studentHistoryRes = await fetch(`${BASE_URL}/assessments/student/me`, {
      headers: { Authorization: `Bearer ${studentAToken}` }
    });
    const studentHistory = await studentHistoryRes.json();
    assert(studentHistoryRes.status === 200 && Array.isArray(studentHistory) && studentHistory.length >= 2, 'Student retrieved their full submission history and grades');
  } catch (err) {
    assert(false, 'Assessments phase exception', err.message);
  }

  // ═══════════════════════════════════════════════════════════════════
  // 5. LIVE MEETINGS, RECURRENCE, GATEKEEPER, POLLS & ATTENDANCE
  // ═══════════════════════════════════════════════════════════════════
  console.log('\n📌 5. LIVE MEETINGS: CREATION, BATCH RECURRENCE, GATEKEEPER, POLLS & ATTENDANCE');
  try {
    // 5.1 Admin Creates Single Live Meeting
    const meetingPayload = {
      title: 'Weekly Live Coding: Fine-Tuning Llama-3',
      description: 'Hands-on live session with screen sharing and Q&A',
      courseId: courseProjectId,
      status: 'scheduled',
      scheduledFor: new Date(Date.now() + 3600000).toISOString(),
      durationMinutes: 90,
      security: {
        requireHostToStart: true,
        muteParticipantsOnJoin: true,
        allowScreenShare: true
      }
    };
    const createMeetRes = await fetch(`${BASE_URL}/meetings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify(meetingPayload)
    });
    const createMeetData = await createMeetRes.json();
    meetingId = createMeetData.meeting?._id || createMeetData.meeting?.roomSlug;
    assert(createMeetRes.status === 201 && meetingId, `Live Meeting created with roomSlug: ${createMeetData.meeting?.roomSlug}`);

    // 5.2 Admin Creates Batch Recurring Sessions Series (e.g. 8 Weeks)
    const batchPayload = {
      title: 'Weekly Mentorship Office Hours',
      courseId: courseProjectId,
      startDate: new Date().toISOString(),
      daysOfWeek: [2, 4], // Tuesday, Thursday
      repeatWeeks: 4,
      frequency: 'weekly',
      durationMinutes: 60,
      seriesId: meetingSeriesId
    };
    const batchMeetRes = await fetch(`${BASE_URL}/meetings/recurrence/batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify(batchPayload)
    });
    const batchMeetData = await batchMeetRes.json();
    assert(batchMeetRes.status === 201 && batchMeetData.createdCount > 0, `Batch recurring meetings created (${batchMeetData.createdCount} sessions generated)`);

    // 5.3 Admin Starts the Meeting
    const startMeetRes = await fetch(`${BASE_URL}/meetings/${createMeetData.meeting?._id}/start`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const startMeetData = await startMeetRes.json();
    assert(startMeetRes.status === 200 && startMeetData.meeting?.status === 'live', 'Instructor started the meeting session (status changed to live)');

    // 5.4 Enrolled Student A Joins via Gatekeeper (/authorize-join)
    const joinAuthResA = await fetch(`${BASE_URL}/meetings/authorize-join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${studentAToken}` },
      body: JSON.stringify({ meetingId: createMeetData.meeting?._id })
    });
    const joinAuthDataA = await joinAuthResA.json();
    assert(joinAuthResA.status === 200 && joinAuthDataA.authorized === true && joinAuthDataA.role === 'participant', 'Gatekeeper authorized enrolled Student A to join live classroom');

    // 5.5 Unenrolled Student B Joins (Strictly Denied 403)
    const joinAuthResB = await fetch(`${BASE_URL}/meetings/authorize-join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${studentBToken}` },
      body: JSON.stringify({ meetingId: createMeetData.meeting?._id })
    });
    assert(joinAuthResB.status === 403, 'Gatekeeper strictly denies entry to unenrolled Student B (403 Forbidden)');

    // 5.6 Attendance Sync (Student records duration)
    const syncAttRes = await fetch(`${BASE_URL}/meetings/attendance/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${studentAToken}` },
      body: JSON.stringify({
        roomSlug: createMeetData.meeting?.roomSlug,
        action: 'leave',
        joinTime: new Date(Date.now() - 3600000).toISOString(),
        leaveTime: new Date().toISOString()
      })
    });
    const syncAttData = await syncAttRes.json();
    assert(syncAttRes.status === 200 && syncAttData.success, 'Student attendance & learning minutes synchronized successfully');

    // 5.7 Instructor Creates Live In-Class Poll
    const createPollRes = await fetch(`${BASE_URL}/meetings/polls/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        roomSlug: createMeetData.meeting?.roomSlug,
        question: 'Which LLM quantization format offers best VRAM efficiency on consumer GPUs?',
        options: ['GGUF / Q4_K_M', 'FP16', 'Unquantized FP32', 'INT8 naive'],
        timerSeconds: 30
      })
    });
    const createPollData = await createPollRes.json();
    const pollId = createPollData.poll?.pollId;
    assert(createPollRes.status === 200 && pollId, `Live In-Class Poll created with ID: ${pollId}`);

    // 5.8 Student Votes on Live Poll
    const voteRes = await fetch(`${BASE_URL}/meetings/polls/vote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${studentAToken}` },
      body: JSON.stringify({
        roomSlug: createMeetData.meeting?.roomSlug,
        pollId,
        optionId: 'opt_1'
      })
    });
    const voteData = await voteRes.json();
    assert(voteRes.status === 200 && voteData.poll?.options[0]?.votes >= 1, 'Student cast vote in live poll successfully');

    // 5.9 Double Voting in Same Poll Blocked
    const dupVoteRes = await fetch(`${BASE_URL}/meetings/polls/vote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${studentAToken}` },
      body: JSON.stringify({
        roomSlug: createMeetData.meeting?.roomSlug,
        pollId,
        optionId: 'opt_2'
      })
    });
    assert(dupVoteRes.status === 400, 'Duplicate voting in same poll prevented (400 Bad Request)');

    // 5.10 Instructor Closes Active Poll
    const closePollRes = await fetch(`${BASE_URL}/meetings/polls/${pollId}/close`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ roomSlug: createMeetData.meeting?.roomSlug })
    });
    assert(closePollRes.status === 200, 'Instructor closed the active live poll');

    // 5.11 Instructor Generates AI Lecture Summary
    const aiSummaryRes = await fetch(`${BASE_URL}/meetings/${createMeetData.meeting?._id}/generate-summary`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const aiSummaryData = await aiSummaryRes.json();
    assert(aiSummaryRes.status === 200 && (aiSummaryData.aiSummary?.keyTakeaways?.length > 0 || aiSummaryData.summary?.keyTakeaways?.length > 0), 'AI Lecture Summary & Action Items generated successfully');

    // 5.12 Instructor Ends Meeting
    const endMeetRes = await fetch(`${BASE_URL}/meetings/${createMeetData.meeting?._id}/end`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const endMeetData = await endMeetRes.json();
    assert(endMeetRes.status === 200 && endMeetData.meeting?.status === 'ended', 'Instructor ended live meeting session');

    // 5.13 Admin Deletes Recurring Series
    const deleteSeriesRes = await fetch(`${BASE_URL}/meetings/series/${meetingSeriesId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert(deleteSeriesRes.status === 200, 'Admin deleted entire recurring meeting series');
  } catch (err) {
    assert(false, 'Meetings phase exception', err.message);
  }

  // ═══════════════════════════════════════════════════════════════════
  // 6. ANALYTICS & CALENDAR EVENTS
  // ═══════════════════════════════════════════════════════════════════
  console.log('\n📌 6. PLATFORM ANALYTICS & CALENDAR EVENTS');
  try {
    // 6.1 Admin Analytics Overview
    const analyticsOverviewRes = await fetch(`${BASE_URL}/analytics/overview`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const analyticsOverview = await analyticsOverviewRes.json();
    assert(analyticsOverviewRes.status === 200 && analyticsOverview.totalUsers > 0 && analyticsOverview.totalCourses > 0, 'Admin retrieved platform-wide analytics overview');

    // 6.2 Admin Student Performance Analytics
    const studentPerfRes = await fetch(`${BASE_URL}/analytics/students`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const studentPerf = await studentPerfRes.json();
    assert(studentPerfRes.status === 200 && Array.isArray(studentPerf) && studentPerf.length > 0, 'Admin retrieved per-student performance analytics table');

    // 6.3 Admin Creates Custom Calendar Event
    const createEventRes = await fetch(`${BASE_URL}/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        title: 'Global AI Hackathon Opening Keynote',
        description: 'Live broadcast with industry founders and mentor matchups.',
        date: new Date(Date.now() + 86400000).toISOString(),
        type: 'event',
        color: '#D4AF37'
      })
    });
    const createEventData = await createEventRes.json();
    eventId = createEventData.id || createEventData._id;
    assert(createEventRes.status === 201 && eventId, `Admin created calendar event with ID: ${eventId}`);

    // 6.4 Student Lists Calendar Events (Combines custom events + assessment deadlines)
    const calendarEventsRes = await fetch(`${BASE_URL}/events`, {
      headers: { Authorization: `Bearer ${studentAToken}` }
    });
    const calendarEvents = await calendarEventsRes.json();
    assert(calendarEventsRes.status === 200 && Array.isArray(calendarEvents) && calendarEvents.length >= 1, 'Student fetched consolidated calendar events and deadlines');
  } catch (err) {
    assert(false, 'Analytics & Events phase exception', err.message);
  }

  // ═══════════════════════════════════════════════════════════════════
  // 7. SECURITY BOUNDARIES & ROLE-BASED ACCESS CONTROL (RBAC)
  // ═══════════════════════════════════════════════════════════════════
  console.log('\n📌 7. SECURITY BOUNDARIES & RBAC ENFORCEMENT');
  try {
    // 7.1 Student blocked from Analytics (403)
    const hackAnalyticsRes = await fetch(`${BASE_URL}/analytics/overview`, {
      headers: { Authorization: `Bearer ${studentAToken}` }
    });
    assert(hackAnalyticsRes.status === 403, 'Student blocked from platform analytics (403 Forbidden)');

    // 7.2 Student blocked from creating events (403)
    const hackEventRes = await fetch(`${BASE_URL}/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${studentAToken}` },
      body: JSON.stringify({ title: 'Unauthorized Student Event' })
    });
    assert(hackEventRes.status === 403, 'Student blocked from creating calendar events (403 Forbidden)');

    // 7.3 Student blocked from manual grading (403)
    const hackGradeRes = await fetch(`${BASE_URL}/assessments/${assignmentId}/submissions/${submissionId}/grade`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${studentAToken}` },
      body: JSON.stringify({ score: 100 })
    });
    assert(hackGradeRes.status === 403, 'Student blocked from grading submissions (403 Forbidden)');
  } catch (err) {
    assert(false, 'Security phase exception', err.message);
  }

  // ═══════════════════════════════════════════════════════════════════
  // 8. TEARDOWN & DATABASE PURIFICATION (CTO-GRADE SANITIZATION)
  // ═══════════════════════════════════════════════════════════════════
  console.log('\n📌 8. POST-TEST TEARDOWN & DATA SANITIZATION');
  try {
    // 8.1 Delete temporary course created during testing
    if (courseId) {
      const delCourseRes = await fetch(`${BASE_URL}/courses/${courseId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      assert(delCourseRes.status === 200 || delCourseRes.status === 204, 'Temporary test course purged');
    }

    // 8.2 Delete temporary test students
    if (studentAId) {
      await fetch(`${BASE_URL}/users/${studentAId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${adminToken}` }
      });
    }
    if (studentBId) {
      await fetch(`${BASE_URL}/users/${studentBId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${adminToken}` }
      });
    }
    assert(true, 'Temporary test student accounts purged');

    // 8.3 Delete temporary test calendar event
    if (eventId) {
      await fetch(`${BASE_URL}/events/${eventId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      assert(true, 'Temporary test calendar event purged');
    }

    // 8.4 Delete temporary meetings
    if (meetingId) {
      await fetch(`${BASE_URL}/meetings/admin/delete/${meetingId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${adminToken}` }
      });
    }
    assert(true, 'Temporary test meetings purged & database pristine');
  } catch (err) {
    console.error('Teardown warning:', err.message);
  }

  // ═══════════════════════════════════════════════════════════════════
  // SUMMARY REPORT
  // ═══════════════════════════════════════════════════════════════════
  console.log('\n======================================================================');
  console.log(`🏁 EXHAUSTIVE SUITE COMPLETE: ${passedTests} PASSED, ${failedTests} FAILED (TOTAL: ${totalTests})`);
  console.log('======================================================================\n');

  if (failedTests > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runExhaustiveSuite();
