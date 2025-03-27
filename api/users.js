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

// ✅ save an article
router.post("/:userId/save-article", async (req, res) => {
  try {

    const { userId } = req.params;
    const { articleId } = req.body;

    const user = await User.findById(req.params.userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.savedArticles.includes(articleId)) {
      return res.status(400).json({ message: "Article already saved" });
    }

    user.savedArticles.push(articleId);
    await user.save();

    res.status(200).json({ message: "Article saved successfully" });

  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// ✅ remove an article
router.delete("/:userId/remove-Savedarticle", async (req, res) => {
  try {

    const { userId } = req.params;
    const { articleId } = req.body;

    const user = await User.findById(req.params.userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (!user.savedArticles.includes(articleId)) {
      return res.status(400).json({ message: "Article not found in saved list" });
    }

    user.savedArticles = user.savedArticles.filter(id => id.toString() !== articleId);
    await user.save();

    res.status(200).json({ message: "Article removed successfully" });

  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// ✅ fetch saved article 
router.get("/:userId/saved-articles", async (req, res) => {
  try {

    const { userId } = req.params;

    const user = await User.findById(userId).populate("savedArticles");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({ savedArticles: user.savedArticles });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

module.exports = router;
