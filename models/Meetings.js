const mongoose = require('mongoose');

const meetingSchema = new mongoose.Schema({
  userId: { type: String, required: true }, 
  name: { type: String, required: true },
  scheduledAt: { type: Date, required: true },
  status: { type: String, enum: ['scheduled', 'confirmed', 'completed', 'cancelled'], default: 'scheduled' },
  message: { type: String }
});

const Meeting = mongoose.model('Meeting', meetingSchema);

module.exports = Meeting;
