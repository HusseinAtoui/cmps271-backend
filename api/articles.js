const express = require('express');
const router = express.Router();
const multer = require('multer');
const axios = require('axios');
const FormData = require('form-data');
const Article = require('../models/Article');
const { verifyToken } = require('../middleware/authenticateUser');
require('dotenv').config();

// ✅ Multer setup for memory storage (storing images in memory before upload)
const upload = multer({ storage: multer.memoryStorage() });
const imagekit = new ImageKit({
  publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
  privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
  urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT,
});



// ✅ Upload image to ImageKit
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
// ✅ Get all approved articles (pending = true)
router.get('/approved', async (req, res) => {
  try {
    const articles = await Article.find({ pending: true });
    res.json(articles);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ Get all non approved articles (pending = false)
router.get('/pending', async (req, res) => {
  try {
    const articles = await Article.find({ pending: false });
    res.json(articles);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});



// ✅ Create a new article
router.post('/add', upload.single('image'), async (req, res) => {
  try {
    console.log("📩 Received event data:", req.body);
  
    let imageUrl = "https://ik.imagekit.io/default.png"; // Default ImageKit placeholder
    if (req.file) {
      imageUrl = await uploadToImageKit(req.file.buffer, req.file.originalname);
    }
    const newArticle = new Article({
      title: req.body.title,
      image: imageUrl,
      description: req.body.description,
      date: req.body.date,
      text: req.body.text,
      userID: req.user.id, // ✅ Get userID from the token
      minToRead: req.body.minToRead,
      tag: req.body.tag,
      pending: false
    });

    const savedArticle = await newArticle.save();
    res.status(201).json(savedArticle);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// ✅ Get article by ID
router.get('/:id', async (req, res) => {
  try {
    const article = await Article.findById(req.params.id);
    if (!article) return res.status(404).json({ error: 'Article not found' });
    res.json(article);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// ✅ Approve an article (Set pending = true)
router.put('/approve/:id', async (req, res) => {
  try {
    const approvedArticle = await Article.findByIdAndUpdate(
      req.params.id,
      { pending: true },
      { new: true }
    )

    if (!approvedArticle) return res.status(404).json({ error: "Article not found" });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ Get all approved articles by an author (pending = true) 
router.get('/authorapproved/:id', async (req, res) => {
  try {
    const authorId = req.params.id;
    const articles = await Article.find({ userID: authorId, pending: true });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ Get all pending articles by an author (pending = false) 
router.get('/authorpending/:id', async (req, res) => {
  try {
    const authorId = req.params.id;
    const articles = await Article.find({ userID: authorId, pending: false });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/tag/:tag', async (req, res) => {
  try {
    const tag = req.params.tag;
    const articles = await Article.find({ tag: { $regex: new RegExp("^" + tag + "$", "i") } });
    res.json(articles);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ Delete an article by ID
router.delete('/delete/:id', async (req, res) => {
  try {
    const article = await Article.findById(req.params.id);
    if (!article) return res.status(404).json({ error: 'Article not found' });

    await Article.findByIdAndDelete(req.params.id);
    res.json({ message: 'Article deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
