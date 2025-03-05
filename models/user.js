const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username:         { type: String, required: true },
  email:            { type: String, required: true, unique: true },
  firstName:        { type: String, required: true },
  lastName:         { type: String, required: true },
  password:         { type: String, required: true },
  occupation:       { type: String },
  bio:              { type: String },
  profilePicture:   { type: String },
  verificationToken:{ type: String },
  verified:         { type: Boolean, default: false },
  deactivated:      { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
