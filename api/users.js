const express = require("express");
const jwt = require("jsonwebtoken");
const User = require('../models/user');
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

// ✅ Get User Profile
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
// ✅ Save Article Route
// This route will add an article to the user's savedArticles array.
// It uses verifyToken middleware to ensure the user is authenticated.
router.post("/save-article", verifyToken, async (req, res) => {
  const { articleId } = req.body;

  try {
    // The verifyToken middleware should set req.user with the authenticated user's info
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    // Check if the article is already saved
    if (user.savedArticles.includes(articleId)) {
      return res.status(400).json({ message: "Article already saved." });
    }

    // Add the article to savedArticles
    user.savedArticles.push(articleId);
    await user.save();

    res.status(200).json({ 
      message: "Article saved successfully", 
      savedArticles: user.savedArticles 
    });
  } catch (err) {
    console.error("Error saving article:", err);
    res.status(500).json({ message: "Server error" });
  }
});
router.get("/saved-articles", verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).populate('savedArticles');
    if (!user) return res.status(404).json({ message: "User not found" });

    res.status(200).json({ savedArticles: user.savedArticles });
  } catch (error) {
    console.error("Error retrieving saved articles:", error);
    res.status(500).json({ message: "Server error" });
  }
})
module.exports = router;
