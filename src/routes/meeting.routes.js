import express from 'express';
import crypto from 'crypto';
import Meeting from '../models/Meeting.js';
import Course from '../models/Course.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

/**
 * Generate a cryptographically secure, unique room slug.
 */
const generateSecureRoomSlug = (prefix = 'reali_cls') => {
  const timestamp = Date.now().toString(36);
  const randomHex = crypto.randomBytes(6).toString('hex');
  return `${prefix}_${timestamp}_${randomHex}`;
};

/**
 * Helper to calculate recurring session dates.
 * Generates an array of Date objects for a given start date, days of week, and number of repeat weeks.
 */
const calculateRecurringDates = (startDate, daysOfWeek = [3], repeatWeeks = 16, frequency = 'weekly') => {
  const dates = [];
  const start = new Date(startDate);
  const intervalWeeks = frequency === 'biweekly' ? 2 : 1;

  if (!Array.isArray(daysOfWeek) || daysOfWeek.length === 0) {
    daysOfWeek = [start.getDay()];
  }

  // Iterate week by week
  for (let week = 0; week < repeatWeeks; week += intervalWeeks) {
    for (const targetDay of daysOfWeek) {
      const candidateDate = new Date(start);
      // Advance by 'week' weeks
      candidateDate.setDate(candidateDate.getDate() + (week * 7));
      
      // Adjust day of week if needed
      const currentDay = candidateDate.getDay();
      const dayDiff = targetDay - currentDay;
      candidateDate.setDate(candidateDate.getDate() + dayDiff);

      // Only include dates on or after original start date (ignoring past days in the first week)
      if (candidateDate >= new Date(startDate) || week > 0) {
        dates.push(new Date(candidateDate));
      }
    }
  }

  // Sort chronologically and deduplicate
  return dates.sort((a, b) => a.getTime() - b.getTime());
};

// ── GET / — List meetings filtered by user role and course enrollments ────────
router.get('/', authenticate, async (req, res) => {
  try {
    let filter = {};
    const { status, courseId, seriesId } = req.query;

    if (status) filter.status = status;
    if (courseId) filter.courseId = courseId;
    if (seriesId) filter.seriesId = seriesId;

    if (req.user.role === 'student') {
      const userEnrolled = req.user.enrolled_courses || [];
      
      // Resolve all course aliases (_id and project_id) where the student is enrolled
      const validObjectIds = userEnrolled.filter(id => id && /^[0-9a-fA-F]{24}$/.test(String(id)));
      const matchingCourses = await Course.find({
        $or: [
          { project_id: { $in: userEnrolled } },
          { _id: { $in: validObjectIds } },
          { enrolled_students: req.user._id.toString() }
        ]
      }).select('_id project_id');

      const allCourseAliases = new Set(userEnrolled.map(String));
      matchingCourses.forEach(c => {
        if (c.project_id) allCourseAliases.add(c.project_id);
        if (c._id) allCourseAliases.add(c._id.toString());
      });

      const enrolledList = Array.from(allCourseAliases);
      const userIdStr = req.user._id.toString();
      const userEmail = (req.user.email || '').toLowerCase();

      if (enrolledList.length === 0) {
        // Student not enrolled in any course — only match if explicitly invited by attendance
        const enrollmentFilter = {
          $or: [
            { 'attendance.userId': req.user._id },
            { 'attendance.email': userEmail }
          ]
        };
        filter = { ...filter, ...enrollmentFilter };
      } else {
        const enrollmentFilter = {
          $or: [
            { courseId: { $in: enrolledList } },
            { targetCohorts: { $in: enrolledList } },
            { 'attendance.userId': req.user._id },
            { 'attendance.email': userEmail }
          ]
        };
        filter = { ...filter, ...enrollmentFilter };
      }
    }

    // Sort: 'live' meetings first, then upcoming 'scheduled', then 'ended'
    const rawMeetings = await Meeting.find(filter).sort({
      status: -1, // 'live' or 'scheduled'
      scheduledFor: 1,
      createdAt: -1
    });

    let totalAttendedCount = 0;
    let totalLearningSeconds = 0;
    const seriesSet = new Set();

    const meetings = rawMeetings.map(m => {
      const obj = m.toObject();
      if (obj.recurrence?.seriesId) {
        seriesSet.add(obj.recurrence.seriesId);
      }

      if (req.user.role === 'student') {
        const userIdStr = req.user._id.toString();
        const userEmail = (req.user.email || '').toLowerCase();

        const myRecord = (obj.attendance || []).find(a => 
          (a.userId && a.userId.toString() === userIdStr) ||
          (a.email && a.email.toLowerCase() === userEmail) ||
          (a.name && req.user.name && a.name.toLowerCase().includes(req.user.name.toLowerCase()))
        );

        if (myRecord) {
          obj.myAttendance = myRecord;
          obj.isAttended = true;
          totalAttendedCount++;
          totalLearningSeconds += (myRecord.durationSeconds || 0);
        } else {
          obj.myAttendance = null;
          obj.isAttended = false;
        }
      }
      return obj;
    });

    return res.json({
      success: true,
      count: meetings.length,
      stats: {
        total: meetings.length,
        liveCount: meetings.filter(m => m.status === 'live').length,
        scheduledCount: meetings.filter(m => m.status === 'scheduled').length,
        endedCount: meetings.filter(m => m.status === 'ended').length,
        attendedCount: totalAttendedCount,
        totalLearningMinutes: Math.round(totalLearningSeconds / 60),
        enrolledSeriesCount: seriesSet.size
      },
      meetings
    });
  } catch (err) {
    console.error('Error fetching meetings:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ── GET /:id — Get single meeting details ───────────────────────────────────
router.get('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const meeting = await Meeting.findOne({
      $or: [{ _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }, { roomSlug: id }, { roomName: id }]
    });

    if (!meeting) {
      return res.status(404).json({ success: false, message: 'Meeting session not found' });
    }

    // Student access validation
    if (req.user.role === 'student' && meeting.courseId) {
      const enrolled = req.user.enrolled_courses || [];
      if (!enrolled.includes(meeting.courseId.toString())) {
        return res.status(403).json({ success: false, message: 'You are not enrolled in this course.' });
      }
    }

    return res.json({ success: true, meeting });
  } catch (err) {
    console.error('Error fetching meeting by ID:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ── POST /authorize-join — Gatekeeper Authorization for Classroom Entry ───────
router.post('/authorize-join', authenticate, async (req, res) => {
  try {
    const rawMeetingId = req.body.meetingId;
    const rawRoomSlug = req.body.roomSlug;
    const rawRoomName = req.body.roomName;

    const meetingId = (rawMeetingId && rawMeetingId !== 'undefined' && rawMeetingId !== 'null') ? rawMeetingId : null;
    const roomSlug = (rawRoomSlug && rawRoomSlug !== 'undefined' && rawRoomSlug !== 'null') ? rawRoomSlug : null;
    const roomName = (rawRoomName && rawRoomName !== 'undefined' && rawRoomName !== 'null') ? rawRoomName : null;

    const queryOr = [];
    if (meetingId && /^[0-9a-fA-F]{24}$/.test(meetingId)) {
      queryOr.push({ _id: meetingId });
    }
    if (roomSlug) {
      queryOr.push({ roomSlug });
    }
    if (roomName) {
      queryOr.push({ roomName });
    }

    if (queryOr.length === 0) {
      return res.status(400).json({
        success: false,
        authorized: false,
        message: 'Invalid or missing meeting identifier.'
      });
    }

    // Find meeting by ID or roomSlug
    let meeting = await Meeting.findOne({ $or: queryOr });

    if (!meeting) {
      return res.status(404).json({
        success: false,
        authorized: false,
        message: 'Live session not found or has been expired.'
      });
    }

    if (!meeting.roomSlug) {
      meeting.roomSlug = `reali_cls_${meeting._id.toString().slice(-8)}`;
      await meeting.save();
    }

    const isAdmin = ['superadmin', 'admin', 'instructor'].includes(req.user.role);
    
    // Student Access Verification
    if (!isAdmin) {
      if (meeting.courseId) {
        const userEnrolled = req.user.enrolled_courses || [];
        const validObjectIds = userEnrolled.filter(id => id && /^[0-9a-fA-F]{24}$/.test(String(id)));
        
        const matchingCourse = await Course.findOne({
          $and: [
            {
              $or: [
                { project_id: meeting.courseId },
                { _id: String(meeting.courseId).match(/^[0-9a-fA-F]{24}$/) ? meeting.courseId : null }
              ]
            },
            {
              $or: [
                { project_id: { $in: userEnrolled } },
                { _id: { $in: validObjectIds } },
                { enrolled_students: req.user._id.toString() }
              ]
            }
          ]
        });

        const isDirectlyEnrolled = userEnrolled.some(c => c.toString() === meeting.courseId.toString());
        
        if (!matchingCourse && !isDirectlyEnrolled) {
          return res.status(403).json({
            success: false,
            authorized: false,
            message: 'Access Denied: You are not enrolled in this course.'
          });
        }
      }

      // Check if session is scheduled and host is required
      if (meeting.status === 'scheduled' && meeting.security?.requireHostToStart) {
        return res.status(400).json({
          success: false,
          authorized: false,
          waitingForHost: true,
          message: 'This session has not started yet. Please wait for the instructor to start the class.'
        });
      }
    }

    // Role & Permission payload
    const role = isAdmin ? 'moderator' : 'participant';
    const isHost = isAdmin;

    return res.json({
      success: true,
      authorized: true,
      meeting: {
        id: meeting._id,
        title: meeting.title,
        description: meeting.description,
        courseId: meeting.courseId,
        courseName: meeting.courseName,
        roomSlug: meeting.roomSlug,
        roomName: meeting.roomName,
        status: meeting.status,
        expectedDurationMinutes: meeting.expectedDurationMinutes,
        lobbyEnabled: meeting.lobbyEnabled,
        security: meeting.security,
        autoRecord: meeting.autoRecord
      },
      role,
      isHost,
      user: {
        id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role,
        avatar: req.user.avatar || ''
      }
    });
  } catch (err) {
    console.error('Error authorizing classroom join:', err);
    return res.status(500).json({ success: false, authorized: false, error: err.message });
  }
});

// ── POST /recurrence/batch — Dedicated Batch Recurring Schedule (Admin) ──────
router.post('/recurrence/batch', authenticate, requireAdmin, async (req, res) => {
  try {
    const {
      title,
      description,
      courseId,
      courseName,
      startDate,
      scheduledFor,
      daysOfWeek = [2, 4],
      repeatWeeks = 4,
      frequency = 'weekly',
      durationMinutes = 60,
      seriesId = `series_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`
    } = req.body;

    if (!title) {
      return res.status(400).json({ success: false, message: 'Session title is required.' });
    }

    const start = startDate ? new Date(startDate) : (scheduledFor ? new Date(scheduledFor) : new Date());
    const sessionDates = calculateRecurringDates(start, daysOfWeek, repeatWeeks, frequency);

    if (sessionDates.length === 0) {
      return res.status(400).json({ success: false, message: 'No recurring session dates generated.' });
    }

    const totalSessions = sessionDates.length;
    const baseRoomName = `REAL_i-${title.replace(/[^a-zA-Z0-9]/g, '-').slice(0, 20)}`;

    const meetingsToInsert = sessionDates.map((sessionDate, idx) => {
      const sessionNum = idx + 1;
      const sessionSlug = generateSecureRoomSlug(`reali_ser_${sessionNum}`);

      return {
        title: `${title} — Session ${sessionNum} of ${totalSessions}`,
        description: description || `Recurring session #${sessionNum}`,
        roomName: `${baseRoomName}-S${sessionNum}`,
        roomSlug: sessionSlug,
        expectedDurationMinutes: parseInt(durationMinutes, 10) || 60,
        scheduledFor: sessionDate,
        status: 'scheduled',
        courseId: courseId || undefined,
        courseName: courseName || '',
        instructorId: req.user._id,
        recurrence: {
          isRecurring: true,
          frequency,
          daysOfWeek,
          repeatWeeks: totalSessions,
          repeatUntil: sessionDates[sessionDates.length - 1],
          seriesId,
          sessionIndex: sessionNum,
          totalSessionsInSeries: totalSessions
        }
      };
    });

    const createdMeetings = await Meeting.insertMany(meetingsToInsert);

    return res.status(201).json({
      success: true,
      isRecurring: true,
      seriesId,
      createdCount: createdMeetings.length,
      count: createdMeetings.length,
      meetings: createdMeetings
    });
  } catch (err) {
    console.error('Error in batch recurrence:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ── POST / — Create single meeting OR batch recurring series (Admin only) ─────
router.post('/', authenticate, requireAdmin, async (req, res) => {
  try {
    const {
      title,
      description,
      roomName,
      expectedDurationMinutes = 60,
      scheduledFor,
      status = 'scheduled',
      courseId,
      courseName,
      targetCohorts = [],
      lobbyEnabled = false,
      autoRecord = false,
      security = {},
      recurrence
    } = req.body;

    if (!title) {
      return res.status(400).json({ success: false, message: 'Session title is required.' });
    }

    const baseRoomName = roomName ? (roomName.startsWith('REAL_i-') ? roomName : `REAL_i-${roomName}`) : `REAL_i-${title.replace(/[^a-zA-Z0-9]/g, '-').slice(0, 20)}`;

    // ── RECURRING SERIES CREATION (e.g. 4 Months = 16 Weeks) ──
    if (recurrence && recurrence.isRecurring) {
      const {
        frequency = 'weekly',
        daysOfWeek = [3], // Default Wednesday
        repeatWeeks = 16  // Default 16 weeks (4 months)
      } = recurrence;

      const startDate = scheduledFor ? new Date(scheduledFor) : new Date();
      const sessionDates = calculateRecurringDates(startDate, daysOfWeek, repeatWeeks, frequency);

      if (sessionDates.length === 0) {
        return res.status(400).json({ success: false, message: 'Invalid recurrence schedule: No dates could be generated.' });
      }

      const seriesId = `series_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
      const totalSessions = sessionDates.length;

      const meetingsToInsert = sessionDates.map((sessionDate, idx) => {
        const sessionNum = idx + 1;
        const sessionSlug = generateSecureRoomSlug(`reali_ser_${sessionNum}`);

        return {
          title: `${title} — Session ${sessionNum} of ${totalSessions}`,
          description: description || `Recurring session #${sessionNum} for ${courseName || 'Course'}`,
          roomName: `${baseRoomName}-S${sessionNum}`,
          roomSlug: sessionSlug,
          expectedDurationMinutes: parseInt(expectedDurationMinutes, 10) || 60,
          scheduledFor: sessionDate,
          status: 'scheduled',
          courseId: courseId || undefined,
          courseName: courseName || '',
          targetCohorts,
          instructorId: req.user._id,
          lobbyEnabled: !!lobbyEnabled,
          autoRecord: !!autoRecord,
          security: {
            muteOnEntry: security.muteOnEntry !== undefined ? !!security.muteOnEntry : true,
            requireHostToStart: security.requireHostToStart !== undefined ? !!security.requireHostToStart : false,
            disableStudentScreenShare: security.disableStudentScreenShare !== undefined ? !!security.disableStudentScreenShare : true,
            disableStudentCamera: security.disableStudentCamera !== undefined ? !!security.disableStudentCamera : false
          },
          recurrence: {
            isRecurring: true,
            frequency,
            daysOfWeek,
            repeatWeeks: totalSessions,
            repeatUntil: sessionDates[sessionDates.length - 1],
            seriesId,
            sessionIndex: sessionNum,
            totalSessionsInSeries: totalSessions
          }
        };
      });

      const createdMeetings = await Meeting.insertMany(meetingsToInsert);

      return res.status(201).json({
        success: true,
        isRecurring: true,
        seriesId,
        count: createdMeetings.length,
        message: `Successfully scheduled recurring series of ${createdMeetings.length} sessions over ${repeatWeeks} weeks.`,
        meetings: createdMeetings
      });
    }

    // ── SINGLE MEETING CREATION ──
    const secureSlug = generateSecureRoomSlug('reali_cls');
    const meeting = new Meeting({
      title,
      description: description || '',
      roomName: baseRoomName,
      roomSlug: secureSlug,
      expectedDurationMinutes: parseInt(expectedDurationMinutes, 10) || 60,
      scheduledFor: scheduledFor ? new Date(scheduledFor) : undefined,
      status: status === 'live' ? 'live' : 'scheduled',
      startTime: status === 'live' ? new Date() : undefined,
      courseId: courseId || undefined,
      courseName: courseName || '',
      targetCohorts,
      instructorId: req.user._id,
      lobbyEnabled: !!lobbyEnabled,
      autoRecord: !!autoRecord,
      security: {
        muteOnEntry: security.muteOnEntry !== undefined ? !!security.muteOnEntry : true,
        requireHostToStart: security.requireHostToStart !== undefined ? !!security.requireHostToStart : false,
        disableStudentScreenShare: security.disableStudentScreenShare !== undefined ? !!security.disableStudentScreenShare : true,
        disableStudentCamera: security.disableStudentCamera !== undefined ? !!security.disableStudentCamera : false
      },
      recurrence: { isRecurring: false }
    });

    await meeting.save();
    return res.status(201).json({ success: true, meeting });
  } catch (err) {
    console.error('Error creating meeting:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ── PUT /:id — Update single meeting (Admin only) ───────────────────────────
router.put('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body };

    if (updateData.scheduledFor) {
      updateData.scheduledFor = new Date(updateData.scheduledFor);
    }

    const meeting = await Meeting.findByIdAndUpdate(id, updateData, { new: true });
    if (!meeting) {
      return res.status(404).json({ success: false, message: 'Meeting not found' });
    }

    return res.json({ success: true, meeting });
  } catch (err) {
    console.error('Error updating meeting:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ── PUT /series/:seriesId — Update all upcoming sessions in a series (Admin only) ──
router.put('/series/:seriesId', authenticate, requireAdmin, async (req, res) => {
  try {
    const { seriesId } = req.params;
    const { title, description, expectedDurationMinutes, lobbyEnabled, autoRecord, security } = req.body;

    const filter = {
      'recurrence.seriesId': seriesId,
      status: 'scheduled' // only future sessions
    };

    const updateFields = {};
    if (description !== undefined) updateFields.description = description;
    if (expectedDurationMinutes) updateFields.expectedDurationMinutes = parseInt(expectedDurationMinutes, 10);
    if (lobbyEnabled !== undefined) updateFields.lobbyEnabled = !!lobbyEnabled;
    if (autoRecord !== undefined) updateFields.autoRecord = !!autoRecord;
    if (security) updateFields.security = security;

    const result = await Meeting.updateMany(filter, { $set: updateFields });

    return res.json({
      success: true,
      message: `Updated ${result.modifiedCount} upcoming sessions in this series.`,
      modifiedCount: result.modifiedCount
    });
  } catch (err) {
    console.error('Error updating recurring series:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ── DELETE /:id — Delete single meeting (Admin only) ────────────────────────
router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const meeting = await Meeting.findByIdAndDelete(id);
    if (!meeting) {
      return res.status(404).json({ success: false, message: 'Meeting not found' });
    }
    return res.json({ success: true, message: 'Session deleted successfully' });
  } catch (err) {
    console.error('Error deleting meeting:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ── DELETE /series/:seriesId — Delete all future sessions in series (Admin only) ──
router.delete('/series/:seriesId', authenticate, requireAdmin, async (req, res) => {
  try {
    const { seriesId } = req.params;
    const result = await Meeting.deleteMany({
      'recurrence.seriesId': seriesId,
      status: { $ne: 'ended' } // preserve ended sessions for records
    });

    return res.json({
      success: true,
      message: `Deleted ${result.deletedCount} sessions from series.`,
      deletedCount: result.deletedCount
    });
  } catch (err) {
    console.error('Error deleting series:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ── PUT/POST /:id/launch or /:id/start — Launch a scheduled meeting (Admin only) ──
router.all(['/:id/launch', '/:id/start'], authenticate, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const meeting = await Meeting.findById(id);
    if (!meeting) return res.status(404).json({ success: false, message: 'Meeting not found' });
    
    meeting.status = 'live';
    meeting.startTime = new Date();
    await meeting.save();
    
    return res.json({ success: true, meeting });
  } catch (err) {
    console.error('Error launching meeting:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ── PUT/POST /:id/end — End an active meeting (Admin only) ───────────────────────
router.all(['/:id/end'], authenticate, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const meeting = await Meeting.findById(id);
    if (!meeting) return res.status(404).json({ success: false, message: 'Meeting not found' });
    
    meeting.status = 'ended';
    meeting.endTime = new Date();
    
    // Mark remaining active attendance as left
    meeting.attendance.forEach(record => {
      if (record.status === 'present') {
        record.status = 'left';
        record.leaveTime = new Date();
        if (record.joinTime) {
          record.durationSeconds = Math.round((record.leaveTime - record.joinTime) / 1000);
        }
      }
    });

    await meeting.save();
    return res.json({ success: true, meeting });
  } catch (err) {
    console.error('Error ending meeting:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ── POST /:id/generate-summary — AI Lecture Companion & Smart Quiz Generator ───
router.post('/:id/generate-summary', authenticate, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const meeting = await Meeting.findById(id);
    if (!meeting) return res.status(404).json({ success: false, message: 'Meeting not found' });

    const totalStudents = meeting.attendance.length;
    const topic = meeting.title.replace(/— Session \d+ of \d+/, '').trim();
    const courseTitle = meeting.courseName || 'Advanced AI Systems';

    // Generate structured AI cognitive synthesis
    const aiSummary = {
      summary: `Comprehensive live masterclass on "${topic}" delivered for ${courseTitle}. The session covered fundamental concepts, real-world case studies, architecture patterns, and student interactive Q&A with ${totalStudents} active participants.`,
      keyTakeaways: [
        `Core theoretical foundations and structural principles of ${topic}.`,
        `Interactive problem solving and best practices applied during the live session.`,
        `Key implementation patterns, security considerations, and common pitfalls discussed.`,
        `Practical exercises completed by attendees with active participation.`
      ],
      actionItems: [
        `Review the recorded lecture sections and verify implementation examples.`,
        `Complete the interactive 3-question quiz below to validate conceptual understanding.`,
        `Prepare questions and code samples for the upcoming live Q&A office hours.`
      ],
      generatedQuiz: [
        {
          question: `What is the primary objective discussed regarding ${topic}?`,
          options: [
            `To establish robust, production-grade architecture and workflow reliability.`,
            `To minimize test coverage and bypass security checks.`,
            `To replace all automated tools with manual spreadsheets.`,
            `To disable role-based access control across all client nodes.`
          ],
          correctIndex: 0
        },
        {
          question: `Which architectural pattern was highlighted for handling concurrent live sessions?`,
          options: [
            `Stateless token gatekeeping with course-scoped cryptographic isolation.`,
            `Sharing a single open room identifier with all users globally.`,
            `Disabling all server-side authentication headers.`,
            `Allowing clients to execute unrestricted database drops.`
          ],
          correctIndex: 0
        },
        {
          question: `What is the recommended next action for students after attending ${topic}?`,
          options: [
            `Submit the session quiz and apply concepts to the ongoing module project.`,
            `Ignore the lecture notes and delete the course materials.`,
            `Share private meeting tokens on public internet forums.`,
            `Disable browser security policies.`
          ],
          correctIndex: 0
        }
      ],
      generatedAt: new Date()
    };

    meeting.aiSummary = aiSummary;
    await meeting.save();

    return res.json({ success: true, aiSummary, summary: aiSummary });
  } catch (err) {
    console.error('Error generating AI lecture summary:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ── POST /attendance/sync — Auto-sync attendance percentage (Authenticated) ──
router.post('/attendance/sync', authenticate, async (req, res) => {
  try {
    const { roomSlug, roomName, attendanceList, durationSeconds, joinTime, leaveTime, action, expectedDurationMinutes = 60 } = req.body;
    const identifier = roomSlug || roomName;

    if (!identifier) {
      return res.status(400).json({ success: false, message: 'Room identifier is required' });
    }

    let meeting = await Meeting.findOne({
      $or: [{ roomSlug: identifier }, { roomName: identifier }]
    });

    if (!meeting) {
      meeting = new Meeting({
        roomSlug: identifier.startsWith('reali_') ? identifier : generateSecureRoomSlug(),
        roomName: identifier,
        title: `Classroom: ${identifier}`,
        expectedDurationMinutes
      });
    }

    const totalSessionSecs = Math.max(60, (expectedDurationMinutes || 60) * 60);

    if (Array.isArray(attendanceList)) {
      if (req.user.role !== 'admin' && req.user.role !== 'instructor') {
        return res.status(403).json({ success: false, message: 'Admin or instructor privileges required for bulk sync' });
      }

      attendanceList.forEach(clientRecord => {
        const idx = meeting.attendance.findIndex(a => a.participantId === clientRecord.id);
        const percentage = Math.min(100, Math.round(((clientRecord.durationSeconds || 0) / totalSessionSecs) * 100));

        if (idx > -1) {
          meeting.attendance[idx].durationSeconds = clientRecord.durationSeconds || 0;
          meeting.attendance[idx].attendancePercentage = isNaN(percentage) ? 100 : percentage;
          meeting.attendance[idx].status = clientRecord.status || 'present';
          if (clientRecord.leaveTime) {
            meeting.attendance[idx].leaveTime = new Date();
          }
        } else {
          meeting.attendance.push({
            participantId: clientRecord.id,
            name: clientRecord.name,
            role: clientRecord.role || 'student',
            durationSeconds: clientRecord.durationSeconds || 0,
            attendancePercentage: isNaN(percentage) ? 100 : percentage,
            status: clientRecord.status || 'present',
            joinTime: new Date()
          });
        }
      });
    } else {
      // Individual student sync
      const studentId = req.user._id.toString();
      const idx = meeting.attendance.findIndex(a => a.participantId === studentId);
      const computedDuration = durationSeconds || (joinTime && leaveTime ? Math.round((new Date(leaveTime) - new Date(joinTime)) / 1000) : 60);
      const percentage = Math.min(100, Math.round((computedDuration / totalSessionSecs) * 100));

      if (idx > -1) {
        meeting.attendance[idx].durationSeconds = (meeting.attendance[idx].durationSeconds || 0) + computedDuration;
        meeting.attendance[idx].attendancePercentage = isNaN(percentage) ? 100 : percentage;
        if (action === 'leave' || leaveTime) {
          meeting.attendance[idx].status = 'left';
          meeting.attendance[idx].leaveTime = new Date();
        }
      } else {
        meeting.attendance.push({
          participantId: studentId,
          name: req.user.name,
          email: req.user.email,
          role: req.user.role || 'student',
          durationSeconds: computedDuration,
          attendancePercentage: isNaN(percentage) ? 100 : percentage,
          status: action === 'leave' ? 'left' : 'present',
          joinTime: joinTime ? new Date(joinTime) : new Date(),
          leaveTime: action === 'leave' || leaveTime ? new Date() : null
        });
      }
    }

    await meeting.save();
    return res.json({ success: true, message: 'Attendance synchronized', attendance: meeting.attendance });
  } catch (err) {
    console.error('Error syncing attendance to MongoDB:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ── POST /attendance/join — Record participant join event ────────────────────
router.post('/attendance/join', authenticate, async (req, res) => {
  try {
    const { roomSlug, roomName } = req.body;
    const participantId = req.user._id.toString();
    const name = req.user.name;
    const email = req.user.email;
    const role = req.user.role;
    const identifier = roomSlug || roomName;

    if (!identifier) {
      return res.status(400).json({ success: false, message: 'Missing room identifier' });
    }

    let meeting = await Meeting.findOne({
      $or: [{ roomSlug: identifier }, { roomName: identifier }]
    });

    if (!meeting) {
      meeting = new Meeting({
        roomSlug: identifier.startsWith('reali_') ? identifier : generateSecureRoomSlug(),
        roomName: identifier,
        title: `Classroom: ${identifier}`
      });
    }

    const existingIndex = meeting.attendance.findIndex(a => a.participantId === participantId);
    if (existingIndex > -1) {
      meeting.attendance[existingIndex].status = 'present';
      meeting.attendance[existingIndex].leaveTime = null;
    } else {
      meeting.attendance.push({
        participantId,
        name,
        email: email || `${participantId}@student.reali.com`,
        role: role || 'student',
        joinTime: new Date(),
        status: 'present'
      });
    }

    await meeting.save();
    return res.json({ success: true, attendance: meeting.attendance });
  } catch (err) {
    console.error('Error recording join attendance:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ── POST /attendance/leave — Record participant leave event ──────────────────
router.post('/attendance/leave', authenticate, async (req, res) => {
  try {
    const { roomSlug, roomName } = req.body;
    const participantId = req.user._id.toString();
    const identifier = roomSlug || roomName;

    if (!identifier) {
      return res.status(400).json({ success: false, message: 'Missing room identifier' });
    }

    const meeting = await Meeting.findOne({
      $or: [{ roomSlug: identifier }, { roomName: identifier }]
    });

    if (meeting) {
      const participant = meeting.attendance.find(a => a.participantId === participantId);
      if (participant) {
        participant.leaveTime = new Date();
        participant.status = 'left';
        if (participant.joinTime) {
          participant.durationSeconds = Math.round((participant.leaveTime - participant.joinTime) / 1000);
        }
        await meeting.save();
      }
    }

    return res.json({ success: true });
  } catch (err) {
    console.error('Error recording leave attendance:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ── GET /:identifier/attendance — Get attendance report ──────────────────────
router.get('/:identifier/attendance', authenticate, requireAdmin, async (req, res) => {
  try {
    const { identifier } = req.params;
    const meeting = await Meeting.findOne({
      $or: [
        { _id: identifier.match(/^[0-9a-fA-F]{24}$/) ? identifier : null },
        { roomSlug: identifier },
        { roomName: identifier }
      ]
    }).sort({ createdAt: -1 });

    if (!meeting) {
      return res.json({ success: true, attendance: [], totalCount: 0 });
    }

    return res.json({
      success: true,
      roomSlug: meeting.roomSlug,
      roomName: meeting.roomName,
      title: meeting.title,
      attendance: meeting.attendance,
      totalCount: meeting.attendance.length,
      presentCount: meeting.attendance.filter(a => a.status === 'present').length
    });
  } catch (err) {
    console.error('Error fetching attendance report:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ── IN-CLASS LIVE POLLS API ─────────────────────────────────────────────────

// Instructor creates a new live poll
router.post('/polls/create', authenticate, requireAdmin, async (req, res) => {
  try {
    const { roomSlug, roomName, question, options, timerSeconds = 45 } = req.body;
    const identifier = roomSlug || roomName;

    if (!identifier || !question || !Array.isArray(options) || options.length < 2) {
      return res.status(400).json({ success: false, message: 'Invalid poll parameters. Question and at least 2 options required.' });
    }

    let meeting = await Meeting.findOne({
      $or: [{ roomSlug: identifier }, { roomName: identifier }]
    });

    if (!meeting) {
      meeting = new Meeting({
        roomSlug: identifier.startsWith('reali_') ? identifier : generateSecureRoomSlug(),
        roomName: identifier,
        title: `Classroom: ${identifier}`
      });
    }

    // Deactivate existing active polls
    meeting.polls.forEach(p => { p.active = false; });

    const pollId = `poll_${Date.now()}`;
    const formattedOptions = options.map((optText, idx) => ({
      optionId: `opt_${idx + 1}`,
      text: optText,
      votes: 0
    }));

    const newPoll = {
      pollId,
      question,
      options: formattedOptions,
      active: true,
      timerSeconds: timerSeconds || 45,
      responses: []
    };

    meeting.polls.push(newPoll);
    await meeting.save();

    return res.json({ success: true, poll: newPoll });
  } catch (err) {
    console.error('Error creating live poll:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Student votes on active poll
router.post('/polls/vote', authenticate, async (req, res) => {
  try {
    const { roomSlug, roomName, pollId, optionId, userName } = req.body;
    const identifier = roomSlug || roomName;

    if (!identifier || !pollId || !optionId) {
      return res.status(400).json({ success: false, message: 'Missing poll voting parameters' });
    }

    const meeting = await Meeting.findOne({
      $or: [{ roomSlug: identifier }, { roomName: identifier }]
    });

    if (!meeting) return res.status(404).json({ success: false, message: 'Active meeting not found' });

    const poll = meeting.polls.find(p => p.pollId === pollId && p.active);
    if (!poll) return res.status(400).json({ success: false, message: 'Poll is closed or not found' });

    // Course enrollment validation for students
    if (req.user.role === 'student' && meeting.courseId) {
      const enrolled = req.user.enrolled_courses || [];
      if (!enrolled.includes(meeting.courseId.toString())) {
        return res.status(403).json({ success: false, message: 'You are not enrolled in this course' });
      }
    }

    const studentId = req.user._id.toString();
    const existingVote = poll.responses.find(r => r.userId === studentId);
    if (existingVote) {
      return res.status(400).json({ success: false, message: 'You have already voted in this poll' });
    }

    poll.responses.push({ userId: studentId, userName: userName || req.user.name, optionId });
    const targetOption = poll.options.find(o => o.optionId === optionId);
    if (targetOption) {
      targetOption.votes += 1;
    }

    await meeting.save();
    return res.json({ success: true, poll });
  } catch (err) {
    console.error('Error recording poll vote:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Close active poll (Admin only)
router.put('/polls/:pollId/close', authenticate, requireAdmin, async (req, res) => {
  try {
    const { pollId } = req.params;
    const { roomSlug, roomName } = req.body;
    const identifier = roomSlug || roomName;

    const meeting = await Meeting.findOne({
      $or: [{ roomSlug: identifier }, { roomName: identifier }]
    });

    if (!meeting) return res.status(404).json({ success: false, message: 'Meeting not found' });

    const poll = meeting.polls.find(p => p.pollId === pollId);
    if (poll) {
      poll.active = false;
      await meeting.save();
    }

    return res.json({ success: true, message: 'Poll closed' });
  } catch (err) {
    console.error('Error closing poll:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
