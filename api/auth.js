const express = require('express');
const router = express.Router();
const crypto = require('crypto'); 
const nodemailer = require('nodemailer');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const multer = require('multer');
const path = require('path');

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';
const User = require('../models/User');

// Multer configuration for profile picture upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, './uploads');  
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));  
  }
});
const upload = multer({ 
  storage: storage,
  limits: { fileSize: 1024 * 1024 * 5 }  
});

// Email configuration
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// SIGNUP Route (Only email and password are required. firstName and lastName are optional.)
router.post('/signup', upload.single('profilePicture'), async (req, res) => {//change this upload of image to something else later
  const { firstName, lastName, email, password, bio } = req.body;
  // Only email and password are required.
  if (!email || !password|| !firstName||!lastName) {
    return res.json({ status: "FAILED", message: "Email, password, name are required." });
  }
  if (!/^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/.test(email)) {
    return res.json({ status: "FAILED", message: "Invalid email entered." });
  }
  if (!/^[a-zA-Z ]*$/.test(firstName)) {
    return res.json({ status: "FAILED", message: "Invalid first name entered." });
  }
  if (!/^[a-zA-Z ]*$/.test(lastName)) {
    return res.json({ status: "FAILED", message: "Invalid last name entered." });
  }
  if (password.length < 8 || 
      !/[A-Z]/.test(password) || 
      !/[0-9]/.test(password) || 
      !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    return res.json({ 
      status: "FAILED", 
      message: "Password must be at least 8 characters long and contain an uppercase letter, a number, and a special character." 
    });
  }

  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.json({ status: "FAILED", message: "User with this email already exists." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const verificationToken = crypto.randomBytes(32).toString('hex');

    // Use provided firstName and lastName if available, otherwise default to empty string.
    const newUser = new User({
      firstName: req.body.firstName ,
      lastName: req.body.lastName ,
      email,
      password: hashedPassword,
      bio: bio || "I am an aftertinker", // bio remains optional; default is set in the model
      profilePicture: req.file ? req.file.path : 'default.png',
      verificationToken
    });

    const result = await newUser.save();

    const verificationLink = `http://localhost:3000/user/verify/${verificationToken}`;
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Email Verification',
      text: `Click the link to verify your email: ${verificationLink}`
    };

    transporter.sendMail(mailOptions, (err, info) => {
      if (err) {
        return res.json({ status: "FAILED", message: "Error sending verification email." });
      }
      return res.json({
        status: "SUCCESS",
        message: "Signup successful, please verify your email.",
        data: result
      });
    });
  } catch (error) {
    return res.json({ status: "FAILED", message: "An error occurred during signup." });
  }
});

// Email Verification Route
router.get('/verify/:token', async (req, res) => {
  try {
    const user = await User.findOne({ verificationToken: req.params.token });
    if (!user) {
      return res.json({ status: "FAILED", message: "Invalid or expired token." });
    }
    user.verified = true;
    user.verificationToken = null;
    await user.save();
    res.redirect('http://localhost:3000/login.html');
  } catch (error) {
    res.json({ status: "FAILED", message: "Error verifying email." });
  }
});

// LOGIN Route (Requires email and password only)
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.json({ status: "FAILED", message: "Email and password are required." });
  }

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.json({ status: "FAILED", message: "User not found. Please sign up." });
    }
    if (!user.verified) {
      return res.json({ status: "FAILED", message: "Email not verified. Please check your inbox." });
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.json({ status: "FAILED", message: "Incorrect password." });
    }
    if (user.deactivated) {
      user.deactivated = false;
      await user.save();
    }
    const payload = { userId: user._id, email: user.email };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
    res.json({ status: "SUCCESS", message: "Login successful", token, data: user });
  } catch (err) {
    res.json({ status: "FAILED", message: "An error occurred while logging in." });
  }
});

// Profile Update Route (for updating additional info later)
router.put('/update-profile', upload.single('profilePicture'), async (req, res) => {  //change this upload of image to something else later
  const { email, bio } = req.body;
  const profilePicture = req.file ? req.file.path : undefined;

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.json({ status: "FAILED", message: "User not found." });
    }

    if (bio) user.bio = bio;
    if (profilePicture) user.profilePicture = profilePicture;

    await user.save();
    res.json({ status: "SUCCESS", message: "Profile updated successfully.", data: user });
  } catch (error) {
    res.json({ status: "FAILED", message: "Error updating profile." });
  }
});

module.exports = router;
