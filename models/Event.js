const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
  title:       { type: String, required: true },
  image:       { type: String, required: true }, // URL to event image
  description: { type: String },                  
  date:        { type: Date, required: true },
  details:     { type: String },                  
 
});

module.exports = mongoose.model('Event', eventSchema);
