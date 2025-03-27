const mongoose = require('mongoose');

const meetingSchema = new mongoose.Schema({
  user: { type: Object, required: false },
  name: { type: String, required: true },
  email: { type: String, required: true }, // Added email field
  scheduledAt: { type: Date, required: true },
  status: { type: String, enum: ['scheduled', 'confirmed', 'completed', 'cancelled'], default: 'scheduled' },
  message: { type: String }
});

const Meeting = mongoose.model('Meeting', meetingSchema);

module.exports = Meeting;
