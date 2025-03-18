const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const axios = require('axios');
const FormData = require('form-data'); // ✅ Fixed missing import
const multer = require('multer');
const mongoose = require('mongoose');
const User = require('../models/user');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET;
const imagekit = new ImageKit({
  publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
  privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
  urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT,
});
// Multer configuration for profile picture upload
const upload = multer({ storage: multer.memoryStorage() });
const uploadToImageKit = async (fileBuffer, fileName) => {
  try {
    const response = await imagekit.upload({
      file: fileBuffer,
      fileName: fileName || "event_image.jpg",
    });
    return response.url; // ✅ Return ImageKit URL
  } catch (err) {
    console.error("❌ ImageKit Upload Error:", err.message);
    throw new Error("Failed to upload image.");
  }
};
// Nodemailer transporter (email verification)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

router.post('/signup', upload.single('profilePicture'), async (req, res) => {
  const { firstName, lastName, email, password, bio } = req.body;

  if (!email || !password || !firstName || !lastName) {
    return res.status(400).json({ status: "FAILED", message: "Email, password, first name, and last name are required." });
  }

  if (!/^[\w-.]+@[\w-]+\.[\w-.]{2,4}$/.test(email)) {
    return res.status(400).json({ status: "FAILED", message: "Invalid email entered." });
  }

  if (password.length < 8 || 
      !/[A-Z]/.test(password) || 
      !/[0-9]/.test(password) || 
      !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    return res.status(400).json({ 
      status: "FAILED", 
      message: "Password must be at least 8 characters long and contain an uppercase letter, a number, and a special character." 
    });
  }

  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ status: "FAILED", message: "User with this email already exists." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const verificationToken = crypto.randomBytes(32).toString('hex');
    
  let imageUrl = "https://ik.imagekit.io/default.png"; // Default ImageKit placeholder
  if (req.file) {
    imageUrl = await uploadToImageKit(req.file.buffer, req.file.originalname);
  }
    const newUser = new User({
      firstName,
      lastName,
      email,
      password: hashedPassword,
      bio: bio || "I am an aftertinker",
      profilePicture: imageUrl,
      verificationToken,
      verified: false
    });

    const result = await newUser.save();

    const verificationLink = `https://afterthoughts.onrender.com/api/auth/verify/${verificationToken}`;

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Email Verification',
      text: `Click the link to verify your email: ${verificationLink}`
    };

    transporter.sendMail(mailOptions, (err, info) => {
      if (err) {
        console.error("Error sending email:", err);
        return res.status(500).json({ status: "FAILED", message: err.message });
      }
      return res.status(201).json({
        status: "SUCCESS",
        message: "Signup successful, please verify your email.",
        data: result
      });
    });
  } catch (error) {
    console.error("Signup error details:", error);
    return res.status(500).json({ status: "FAILED", message: error.message });
  }
});
router.get('/verify/:token', async (req, res) => {
  try {
    const user = await User.findOne({ verificationToken: req.params.token });
    if (!user) {
      return res.status(400).send("Invalid or expired verification link.");
    }

    user.verified = true;
    user.verificationToken = null;
    await user.save();

    res.redirect('http://localhost:5500/loginPage.html?verified=true'); // Redirect to login after success
  } catch (error) {
    res.status(500).send('Error verifying email.');
  }
});

// User Login Route with JWT Authentication
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
      return res.status(400).json({ status: "FAILED", message: "Email and password are required." });
  }

  try {
      // Check if user exists
      const user = await User.findOne({ email });
      if (!user) {
          return res.status(404).json({ status: "FAILED", message: "User not found. Please sign up." });
      }

      // Check if email is verified
      if (!user.verified) {
          return res.status(403).json({ status: "FAILED", message: "Please verify your email before logging in." });
      }

      // Compare password with stored hash
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
          return res.status(401).json({ status: "FAILED", message: "Incorrect password." });
      }

      // Generate JWT token for user authentication
      const token = jwt.sign(
          { id: user._id, email: user.email },
          JWT_SECRET,
          { expiresIn: '3h' } // Token expires in 1 hour
      );

      res.status(200).json({
          status: "SUCCESS",
          message: "Login successful!",
          token,
          user: {
              id: user._id,
              firstName: user.firstName,
              lastName: user.lastName,
              email: user.email,
              bio: user.bio,
              profilePicture: user.profilePicture
          }
      });

  } catch (error) {
      console.error("Login error details:", error);
      res.status(500).json({ status: "FAILED", message: "An error occurred during login. Please try again later." });
  }
});

module.exports = router;
