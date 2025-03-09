const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const multer = require('multer');
const path = require('path');
const mongoose = require('mongoose');
const User = require('../models/user');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET;

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

    const newUser = new User({
      firstName,
      lastName,
      email,
      password: hashedPassword,
      bio: bio || "I am an aftertinker",
      profilePicture: req.file ? req.file.path : 'default.png',
      verificationToken,
      verified: false
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

module.exports = router;