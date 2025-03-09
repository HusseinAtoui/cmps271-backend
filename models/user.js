const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  firstName:        { type: String, required: true },
  lastName:         { type: String, required: true },
  email:            { type: String, required: true, unique: true },
  password:         { type: String, required: true },
  bio:              { type: String, default: "" },
  profilePicture:   { type: String, default: "" },
  verificationToken:{ type: String },
  verified:         { type: Boolean, default: false },
  deactivated:      { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
