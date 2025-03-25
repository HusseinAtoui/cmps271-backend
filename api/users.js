const express = require("express");
const jwt = require("jsonwebtoken");
User = require('../models/user');
const ImageKit = require('imagekit');

const router = express.Router();
const multer = require('multer');
const axios = require('axios');
const FormData = require('form-data');

const { verifyToken } = require('../middleware/authenticateUser'); 
require('dotenv').config();

// ✅ Multer setup for memory storage (storing images in memory before upload)
const upload = multer({ storage: multer.memoryStorage() });

// Login Route
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email });
  if (!user || !(await user.comparePassword(password))) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  // Generate Token
  const token = jwt.sign({ userId: user._id }, "your-secret-key", { expiresIn: "1h" });

  res.json({ token, userId: user._id });
});

// Get User Profile
router.get("/:userId", async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    res.json({
      name: user.name,
      stats: {
        totalSubmissions: user.totalSubmissions || 0,
        totalReviews: user.totalReviews || 0,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
