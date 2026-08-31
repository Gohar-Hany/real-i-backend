import mongoose from 'mongoose';

const questionSchema = new mongoose.Schema({
  question:       { type: String, required: true },
  type:           { type: String, enum: ['mcq', 'true_false', 'short_answer', 'essay'], default: 'mcq' },
  options:        { type: mongoose.Schema.Types.Mixed, default: {} },   // { A: '...', B: '...', ... }
  correct_answer: { type: String, default: '' },
  explanation:    { type: String, default: '' },
  marks:          { type: Number, default: 1 },
}, { _id: false });

const assessmentSchema = new mongoose.Schema({
  title:         { type: String, required: true, trim: true },
  type:          { type: String, enum: ['quiz', 'exam', 'assignment', 'task'], required: true },
  course_id:     { type: String, required: true, index: true },   // links to Course.project_id
  description:   { type: String, default: '' },
  instructions:  { type: String, default: '' },
  questions:     [questionSchema],
  start_date:    { type: Date, default: null },
  end_date:      { type: Date, default: null },
  time_limit:    { type: Number, default: 0 },                   // minutes, 0 = unlimited
  passing_grade: { type: Number, default: 60 },                  // percentage
  total_marks:   { type: Number, default: 100 },
  max_attempts:  { type: Number, default: 1 },
  shuffle_questions: { type: Boolean, default: false },
  show_results:  { type: Boolean, default: true },
  status:        { type: String, enum: ['draft', 'published', 'closed'], default: 'draft' },
  created_by:    { type: String, required: true },                // admin user ID
  settings:      { type: mongoose.Schema.Types.Mixed, default: {} },
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
});

assessmentSchema.set('toJSON', {
  virtuals: true,
  transform: (_doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

const Assessment = mongoose.model('Assessment', assessmentSchema, 'assessments');
export default Assessment;
