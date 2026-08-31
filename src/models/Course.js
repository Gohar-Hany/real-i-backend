import mongoose from 'mongoose';

const lessonSchema = new mongoose.Schema({
  id:         { type: String, default: () => `les_${Date.now()}_${Math.random().toString(36).slice(2, 8)}` },
  title:      { type: String, required: true },
  duration:   { type: String, default: null },
  type:       { type: String, default: 'video' },
  is_preview: { type: Boolean, default: false },
}, { _id: false });

const moduleSchema = new mongoose.Schema({
  id:      { type: String, default: () => `mod_${Date.now()}_${Math.random().toString(36).slice(2, 8)}` },
  title:   { type: String, required: true },
  lessons: [lessonSchema],
}, { _id: false });

const courseSchema = new mongoose.Schema({
  // project_id links to the Python AI backend's "projects" collection
  project_id:    { type: String, required: true, unique: true, index: true },
  title:         { type: String, required: true, trim: true },
  subtitle:      { type: String, default: '' },
  description:   { type: String, default: '' },
  instructor:    { type: String, default: '' },
  category:      { type: String, default: 'General' },
  level:         { type: String, enum: ['Beginner', 'Intermediate', 'Advanced'], default: 'Beginner' },
  duration:      { type: String, default: '' },
  total_hours:   { type: Number, default: 0 },
  lessons_count: { type: Number, default: 0 },
  thumbnail:     { type: String, default: '' },
  color:         { type: String, default: '#D4AF37' },
  tags:          [{ type: String }],
  modules:       [moduleSchema],
  price:         { type: Number, default: 0 },
  badge:         { type: String, default: null },
  rating:        { type: Number, default: 0, min: 0, max: 5 },
  reviews_count: { type: Number, default: 0 },
  is_published:  { type: Boolean, default: true },
  enrolled_students: [{ type: String }],     // user IDs
  students_enrolled: { type: Number, default: 0 },  // denormalized count
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
});

courseSchema.set('toJSON', {
  virtuals: true,
  transform: (_doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

const Course = mongoose.model('Course', courseSchema, 'courses');
export default Course;
