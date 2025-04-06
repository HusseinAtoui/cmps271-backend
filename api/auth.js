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
const ImageKit = require('imagekit');
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
// google login
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID1, // From your .env file
  clientSecret: process.env.GOOGLE_CLIENT_SECRET1, // From your .env file
  callbackURL: "https://afterthoughts.onrender.com/api/auth/google/callback"
},

async (accessToken, refreshToken, profile, done) => {
  try {
    // Check if a user with this email already exists
    let user = await User.findOne({ email: profile.emails[0].value });
    console.log(user);
    if (!user) {
      // If not, create a new user using profile data from Google
      user = new User({
        firstName: profile.name.givenName,
        lastName: profile.name.familyName || '',
        email: profile.emails[0].value,
        profilePicture: profile.photos[0].value,
        verified: true // Google accounts are considered verified 
      });
      console.log(user);
      await user.save();
    }
    return done(null, user);
  } catch (error) {
    return done(error, null);
  }
}
));

// Configure Passport serialization
passport.serializeUser((user, done) => {
done(null, user._id);
});
passport.deserializeUser(async (id, done) => {
try {
  const user = await User.findById(id);
  done(null, user);
} catch (error) {
  done(error, null);
}
});

// Initialize Passport middleware (if you use sessions, you might need to add express-session middleware in your main server file)
router.use(passport.initialize());

// -------------------------
// Google Auth Routes
// -------------------------

// Route to trigger Google authentication
router.get('/google',
passport.authenticate('google', { scope: ['profile', 'email'] })
);

// Google OAuth callback URL
router.get('/google/callback',
passport.authenticate('google', { failureRedirect: '/login' }),
(req, res) => {
  // Generate a JWT token for the authenticated user
  const token = jwt.sign(
    { id: req.user._id, email: req.user.email },
    JWT_SECRET,
    { expiresIn: '3h' }
  );
  // Redirect to your frontend with the token in query parameters or handle it as needed
  res.redirect(`https://husseinatoui.github.io/cmps271-frontend/profilepage?token=${token}`);
}
);
// end of google login stuff
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

    res.redirect('https://husseinatoui.github.io/cmps271-frontend/loginPage.html'); // Redirect to login after success
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
          { id: user._id, email: user.email, role: user.role },
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
// Logout Route (Client-side handles token clearing)
router.post('/logout', (req, res) => {
  // No action needed here, just a placeholder to notify client to clear token
  res.status(200).json({
    status: "SUCCESS",
    message: "Logged out successfully. Please clear the token client-side."
  });
});

// Change Bio Route
router.put('/change-bio', async (req, res) => {
  const { bio } = req.body;
  const token = req.headers.authorization?.split(' ')[1]; // JWT token from Authorization header

  if (!token) {
    return res.status(401).json({ status: "FAILED", message: "Authorization required." });
  }

  try {
    // Verify JWT
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(404).json({ status: "FAILED", message: "User not found." });
    }

    // Update bio
    user.bio = bio;
    await user.save();

    res.status(200).json({
      status: "SUCCESS",
      message: "Bio updated successfully.",
      user: {
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        bio: user.bio,
        profilePicture: user.profilePicture
      }
    });

  } catch (error) {
    console.error("Error changing bio:", error);
    res.status(500).json({ status: "FAILED", message: "Failed to update bio." });
  }
});

// Change Profile Picture Route
router.put('/change-pfp', upload.single('profilePicture'), async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1]; // JWT token from Authorization header

  if (!token) {
    return res.status(401).json({ status: "FAILED", message: "Authorization required." });
  }

  try {
    // Verify JWT
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(404).json({ status: "FAILED", message: "User not found." });
    }

    let imageUrl = user.profilePicture; // Default to current profile picture URL

    if (req.file) {
      imageUrl = await uploadToImageKit(req.file.buffer, req.file.originalname);
    }

    // Update profile picture
    user.profilePicture = imageUrl;
    await user.save();

    res.status(200).json({
      status: "SUCCESS",
      message: "Profile picture updated successfully.",
      user: {
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        bio: user.bio,
        profilePicture: user.profilePicture
      }
    });

  } catch (error) {
    console.error("Error changing profile picture:", error);
    res.status(500).json({ status: "FAILED", message: "Failed to update profile picture." });
  }
});
router.delete('/delete-account', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1]; // JWT token from Authorization header

  if (!token) {
    return res.status(401).json({ status: "FAILED", message: "Authorization required." });
  }

  try {
    // Verify JWT
    const decoded = jwt.verify(token, JWT_SECRET);
    console.log("Decoded token:", decoded); // Debug log

    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(404).json({ status: "FAILED", message: "User not found." });
    }
    
    // Log user details before deletion for debugging purposes
    console.log("Deleting user:", user);

    // Option 1: Using document.remove()
    // await user.remove();

    // Option 2 (fallback): Using Model.deleteOne()
    await User.deleteOne({ _id: decoded.id });

    res.status(200).json({
      status: "SUCCESS",
      message: "Account deleted successfully."
    });
  } catch (error) {
    console.error("Error deleting account:", error);
    res.status(500).json({ status: "FAILED", message: "Failed to delete account." });
  }
});
// Forgot Password Route (Request Password Reset)
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  
  if (!email) {
    return res.status(400).json({ status: "FAILED", message: "Email is required." });
  }

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ status: "FAILED", message: "User not found." });
    }

    const resetToken = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: '1h' });
    const resetLink = `https://afterthoughts.onrender.com/api/auth/reset-password/${resetToken}`;
    
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Password Reset Request",
      text: `Click the link to reset your password: ${resetLink}`
    };

    transporter.sendMail(mailOptions, (err) => {
      if (err) {
        return res.status(500).json({ status: "FAILED", message: "Error sending email." });
      }
      res.status(200).json({ status: "SUCCESS", message: "Password reset link sent to email." });
    });
  } catch (error) {
    res.status(500).json({ status: "FAILED", message: "An error occurred." });
  }
});

// Reset Password Route
router.post('/reset-password/:token', async (req, res) => {
  const { token } = req.params;
  const { newPassword } = req.body;

  if (!newPassword || newPassword.length < 8) {
    return res.status(400).json({ status: "FAILED", message: "Invalid new password." });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(404).json({ status: "FAILED", message: "User not found." });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    res.status(200).json({ status: "SUCCESS", message: "Password reset successfully." });
  } catch (error) {
    res.status(400).json({ status: "FAILED", message: "Invalid or expired token." });
  }
});

module.exports = router;
