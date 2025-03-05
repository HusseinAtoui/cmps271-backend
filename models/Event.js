const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
  title:       { type: String, required: true },
  image:       { type: String, required: true }, // URL to event image
  description: { type: String },                   // A short description
  date:        { type: Date, required: true },
  details:     { type: String }                    // Additional details (e.g., "3 min read")
});

module.exports = mongoose.model('Event', eventSchema);
