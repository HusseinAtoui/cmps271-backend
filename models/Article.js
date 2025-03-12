const mongoose = require('mongoose');

const articleSchema = new mongoose.Schema({
  title:       { type: String, required: true },
  image:       { type: String, required: true }, // URL to article image
  description: { type: String },                   // A short description or summary
  date:        { type: Date, required: true },
  text:        { type: String, required: true },   // Full article text
  author:      { type: String, required: true },
  minToRead:   { type: Number, required: true },   // Estimated minutes to read
  tag:         { type: String, required: true }      // Tag or attribute for the article
});

module.exports = mongoose.model('Article', articleSchema);
