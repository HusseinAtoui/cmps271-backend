const mongoose = require('mongoose');

const articleSchema = new mongoose.Schema({
  title:           { type: String, required: true },
  image:           { type: String, required: true }, // URL to article image
  description:     { type: String },                   // A short description or summary
  date:            { type: Date, required: true },
  text:            { type: String, required: true },   // Full article text
  author:          { type: String, required: true },
  averageReadTime: { type: Number }                    // In minutes (e.g., 3 or 5)
});

module.exports = mongoose.model('Article', articleSchema);
