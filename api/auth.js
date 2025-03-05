const express = require('express');
const router = express.Router();
const crypto = require('crypto'); // For generating verification tokens
const nodemailer = require('nodemailer');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const multer = require('multer');
const path = require('path');

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';

// Import User model
const User = require('../models/User');

// Multer configuration for profile picture upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, './uploads');  // Directory to save uploaded images
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));  // Unique filename
  }
});
const upload = multer({ 
  storage: storage,
  limits: { fileSize: 1024 * 1024 * 5 }  // Limit file size to 5MB
});

// Email configuration
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER, // Your email
    pass: process.env.EMAIL_PASS
  }
});

// SIGNUP Route
router.post('/signup', upload.single('profilePicture'), async (req, res) => {
  const { username, email, firstName, lastName, password, occupation, bio } = req.body;
  const profilePicture = req.file ? req.file.path : null;
  const missingFields = [];
  if (!username) missingFields.push("username");
  if (!email) missingFields.push("email");
  if (!password) missingFields.push("password");
  if (!firstName) missingFields.push("firstName");
  if (!lastName) missingFields.push("lastName");
  if (!occupation) missingFields.push("occupation");
  if (!bio) missingFields.push("bio");
  if (!profilePicture) missingFields.push("profilePicture");

  if (missingFields.length > 0) {
    return res.json({
      status: "FAILED",
      message: `The following fields are empty: ${missingFields.join(", ")}`
    });
  } else if (!/^[a-zA-Z ]*$/.test(firstName)) {
    return res.json({ status: "FAILED", message: "Invalid first name entered" });
  } else if (!/^[a-zA-Z ]*$/.test(lastName)) {
    return res.json({ status: "FAILED", message: "Invalid last name entered" });
  } else if (!/^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/.test(email)) {
    return res.json({ status: "FAILED", message: "Invalid email entered" });
  } else if (password.length < 8) {
    return res.json({ status: "FAILED", message: "Password is too short" });
  } else if (!/[A-Z]/.test(password)) {
    return res.json({ status: "FAILED", message: "Password must contain at least one uppercase letter" });
  } else if (!/[0-9]/.test(password)) {
    return res.json({ status: "FAILED", message: "Password must contain at least one number" });
  } else if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    return res.json({ status: "FAILED", message: "Password must contain at least one special character" });
  } else {
    try {
      // Check if user exists
      const existingUser = await User.find({ email });
      if (existingUser.length > 0) {
        return res.json({ status: "FAILED", message: "User with this email already exists" });
      }
      const hashedPassword = await bcrypt.hash(password, 10);
      const verificationToken = crypto.randomBytes(32).toString('hex');

      const newUser = new User({
        username,
        email,
        password: hashedPassword,
        firstName,
        lastName,
        occupation,
        bio,
        profilePicture,
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
          console.error(err);
          return res.json({ status: "FAILED", message: "Error sending verification email" });
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
  }
});

// Email Verification Route
router.get('/verify/:token', async (req, res) => {
  const { token } = req.params;
  try {
    const user = await User.findOne({ verificationToken: token });
    if (!user) {
      return res.json({ status: "FAILED", message: "Invalid or expired token" });
    }
    user.verified = true;
    user.verificationToken = null;
    await user.save();
    res.redirect('http://localhost:3000/login.html'); // Adjust the redirect URL as needed
  } catch (error) {
    res.json({ status: "FAILED", message: "Error verifying email" });
  }
});

// LOGIN Route
router.post('/login', upload.none(), async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.json({ status: "FAILED", message: "Empty input credentials" });
  }
  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.json({ status: "FAILED", message: "User not found. Please sign up." });
    }
    if (!user.verified) {
      return res.json({ status: "FAILED", message: "Email not verified. Please check your inbox." });
    }
    if (user.deactivated) {
      user.deactivated = false;
      await user.save();
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.json({ status: "FAILED", message: "Incorrect password" });
    }
    const payload = { userId: user._id, email: user.email };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
    res.json({ status: "SUCCESS", message: "Login successful", token, data: user });
  } catch (err) {
    console.error("Error during login:", err);
    res.json({ status: "FAILED", message: "An error occurred while logging in" });
  }
});

// Forgot Password Route
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.json({ status: "FAILED", message: "Please provide an email." });
  }
  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.json({ status: "FAILED", message: "User not found. Please sign up." });
    }
    if (!user.verified) {
      return res.json({ status: "FAILED", message: "Email not verified. Please check your inbox." });
    }
    const resetToken = crypto.randomBytes(32).toString('hex');
    user.verificationToken = resetToken;
    await user.save();
    const resetLink = `http://localhost:3000/reset-password/${resetToken}`;
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: user.email,
      subject: 'Password Reset Request',
      text: `Please click the following link to reset your password: ${resetLink}`
    };
    transporter.sendMail(mailOptions, (err, info) => {
      if (err) {
        console.error(err);
        return res.json({ status: "FAILED", message: "Error sending email" });
      }
      res.json({ status: "SUCCESS", message: "Password reset email sent. Please check your inbox.", token: resetToken });
    });
  } catch (err) {
    console.error(err);
    res.json({ status: "FAILED", message: "An error occurred while processing the request." });
  }
});

// Reset Password Route
router.post('/reset-password/:token', async (req, res) => {
  const { token } = req.params;
  const { newPassword } = req.body;
  if (!newPassword) {
    return res.json({ status: "FAILED", message: "Please provide a new password." });
  }
  if (newPassword.length < 8) {
    return res.json({ status: "FAILED", message: "Password is too short. It must be at least 8 characters long." });
  } else if (!/[A-Z]/.test(newPassword)) {
    return res.json({ status: "FAILED", message: "Password must contain at least one uppercase letter." });
  } else if (!/[0-9]/.test(newPassword)) {
    return res.json({ status: "FAILED", message: "Password must contain at least one number." });
  } else if (!/[!@#$%^&*(),.?":{}|<>]/.test(newPassword)) {
    return res.json({ status: "FAILED", message: "Password must contain at least one special character." });
  }
  try {
    const user = await User.findOne({ verificationToken: token });
    if (!user) {
      return res.json({ status: "FAILED", message: "Invalid token." });
    }
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    user.verificationToken = null;
    await user.save();
    res.json({ status: "SUCCESS", message: "Password updated successfully." });
  } catch (err) {
    console.error(err);
    res.json({ status: "FAILED", message: "An error occurred while resetting the password." });
  }
});

module.exports = router;
