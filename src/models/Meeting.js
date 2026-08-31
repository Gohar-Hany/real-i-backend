import mongoose from 'mongoose';

const pollOptionSchema = new mongoose.Schema({
  optionId: { type: String, required: true },
  text: { type: String, required: true },
  votes: { type: Number, default: 0 }
});

const pollResponseSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  userName: { type: String },
  optionId: { type: String, required: true }
});

const pollSchema = new mongoose.Schema({
  pollId: { type: String, required: true },
  question: { type: String, required: true },
  options: [pollOptionSchema],
  active: { type: Boolean, default: true },
  timerSeconds: { type: Number, default: 45 },
  responses: [pollResponseSchema],
  createdAt: { type: Date, default: Date.now }
});

const attendanceRecordSchema = new mongoose.Schema({
  participantId: { type: String, required: true },
  name: { type: String, required: true },
  email: { type: String },
  role: { type: String, enum: ['superadmin', 'admin', 'moderator', 'instructor', 'student', 'guest'], default: 'student' },
  joinTime: { type: Date, default: Date.now },
  leaveTime: { type: Date },
  durationSeconds: { type: Number, default: 0 },
  attendancePercentage: { type: Number, default: 100 },
  status: { type: String, enum: ['present', 'left', 'late'], default: 'present' }
});

const recurrenceSchema = new mongoose.Schema({
  isRecurring: { type: Boolean, default: false },
  frequency: { type: String, enum: ['daily', 'weekly', 'biweekly', 'monthly'], default: 'weekly' },
  daysOfWeek: [{ type: Number }], // 0 = Sun, 1 = Mon, ..., 3 = Wed, 6 = Sat
  repeatWeeks: { type: Number, default: 16 }, // e.g. 16 weeks = 4 months
  repeatUntil: { type: Date },
  seriesId: { type: String, index: true },
  sessionIndex: { type: Number, default: 1 },
  totalSessionsInSeries: { type: Number, default: 1 }
}, { _id: false });

const aiSummarySchema = new mongoose.Schema({
  summary: { type: String, default: '' },
  keyTakeaways: [{ type: String }],
  actionItems: [{ type: String }],
  generatedQuiz: [{
    question: { type: String, required: true },
    options: [{ type: String, required: true }],
    correctIndex: { type: Number, default: 0 }
  }],
  generatedAt: { type: Date }
}, { _id: false });

const securitySettingsSchema = new mongoose.Schema({
  muteOnEntry: { type: Boolean, default: true },
  requireHostToStart: { type: Boolean, default: false },
  disableStudentScreenShare: { type: Boolean, default: true },
  disableStudentCamera: { type: Boolean, default: false }
}, { _id: false });

const meetingSchema = new mongoose.Schema({
  roomName: { type: String, required: true, index: true },
  roomSlug: { type: String, required: true, index: true, unique: true },
  title: { type: String, default: 'Live Class Session' },
  description: { type: String, default: '' },
  expectedDurationMinutes: { type: Number, default: 60 },
  instructorId: { type: mongoose.Schema.Types.Mixed, ref: 'User' },
  courseId: { type: mongoose.Schema.Types.Mixed, index: true },
  courseName: { type: String, default: '' },
  targetCohorts: [{ type: String }],
  status: { type: String, enum: ['scheduled', 'live', 'ended'], default: 'scheduled' },
  autoRecord: { type: Boolean, default: false },
  scheduledFor: { type: Date, index: true },
  startTime: { type: Date },
  endTime: { type: Date },
  recurrence: { type: recurrenceSchema, default: () => ({ isRecurring: false }) },
  security: { type: securitySettingsSchema, default: () => ({ muteOnEntry: true, disableStudentScreenShare: true }) },
  aiSummary: { type: aiSummarySchema, default: () => ({}) },
  attendance: [attendanceRecordSchema],
  polls: [pollSchema],
  lobbyEnabled: { type: Boolean, default: false },
  recordingUrl: { type: String },
  passcode: { type: String }
}, { timestamps: true });

export default mongoose.model('Meeting', meetingSchema);
