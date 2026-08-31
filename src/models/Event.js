import mongoose from 'mongoose';

const eventSchema = new mongoose.Schema({
  title:       { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  date:        { type: Date, required: true, index: true },
  time:        { type: String, default: '' },
  type:        { type: String, default: 'custom' },
  course_id:   { type: String, default: null },
  color:       { type: String, default: '#D4AF37' },
  created_by:  { type: String, required: true },
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
});

eventSchema.set('toJSON', {
  virtuals: true,
  transform: (_doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

const Event = mongoose.model('Event', eventSchema, 'calendar_events');
export default Event;
