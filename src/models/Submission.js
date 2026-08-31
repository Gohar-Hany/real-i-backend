import mongoose from 'mongoose';

const submissionSchema = new mongoose.Schema({
  assessment_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Assessment', required: true, index: true },
  student_id:    { type: String, required: true, index: true },
  student_name:  { type: String, default: '' },
  student_email: { type: String, default: '' },
  answers:       { type: mongoose.Schema.Types.Mixed, default: {} },  // { "0": "B", "1": "A", ... } or { text: "..." }
  files:         { type: mongoose.Schema.Types.Mixed, default: [] },
  score:         { type: Number, default: null },
  total_marks:   { type: Number, default: 0 },
  percentage:    { type: Number, default: null },
  time_taken:    { type: Number, default: 0 },   // seconds
  status:        { type: String, enum: ['submitted', 'graded', 'late'], default: 'submitted' },
  feedback:      { type: String, default: '' },
  graded_by:     { type: String, default: null },
}, {
  timestamps: { createdAt: 'submitted_at', updatedAt: 'updated_at' },
});

// Compound index: one submission per student per assessment (unless max_attempts > 1)
submissionSchema.index({ assessment_id: 1, student_id: 1 });

submissionSchema.set('toJSON', {
  virtuals: true,
  transform: (_doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

const Submission = mongoose.model('Submission', submissionSchema, 'submissions');
export default Submission;
