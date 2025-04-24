const mongoose = require('mongoose');

const articleSchema = new mongoose.Schema({
  title: { type: String, required: true },
  image: { type: String, required: true }, // URL to article image
  description: { type: String },                   // A short description or summary
  date: { type: Date, required: true },
  text: { type: String, required: true },   // Full article text
  userID: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  minToRead: { type: Number, required: true },   // Estimated minutes to read
  tag: { type: String, required: true },    // Tag or attribute for the article
  pending: { type: Boolean, required: true, default: false }, // Default is false
  comments: [{
    text: { type: String, required: true },
    postedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    created: { type: Date, default: Date.now },
  }],
  kudos: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }] ,
  vector: { 
    type: [Number],
    index: true,  // Enables vector search optimization
    select: false, // Excludes from query results by default
    default: undefined // Better for sparse arrays
  }
});

module.exports = mongoose.model('Article', articleSchema);
