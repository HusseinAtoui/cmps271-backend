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

const uploadToImgur = async (imageBuffer) => {
  if (!imageBuffer) {
    throw new Error("Image buffer is empty, cannot upload.");
  }

  const formData = new FormData();
  formData.append("image", imageBuffer.toString("base64"));

  try {
    const response = await axios.post("https://api.imgur.com/3/upload", formData, {
      headers: {
        Authorization: `Client-ID ${process.env.IMGUR_CLIENT_ID}`,
        ...formData.getHeaders(),
      },
    });
    return response.data.data.link; // ✅ Return Imgur URL
  } catch (err) {
    console.error("❌ Imgur Upload Error:", err.response ? err.response.data : err.message);
    throw new Error("Failed to upload image to Imgur.");
  }
};

// POST: Create a new article
router.post('/',  upload.single('image'), async (req, res) => {
  try {
    console.log("📩 Received event data:", req.body);
    let picUrl = "https://i.imgur.com/default.png"; // Default profile pic
    if (req.file) {
      picUrl = await uploadToImgur(req.file.buffer);
    }

    const newArticle = new Article({
      ...req.body,
      picUrl,
      user:  "user", // match JWT token payload
    });

    const savedArticle = await newArticle.save();
    res.status(201).json(savedArticle);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT: Update existing article
router.post('/', upload.single('image'), async (req, res) => {
  try {
      console.log("📩 Received Data:", req.body);
      console.log("🖼️ Received File:", req.file); // ✅ Debugging

      let imageUrl = "https://i.imgur.com/default.png"; // Default image
      if (req.file) {
          imageUrl = await uploadToImgur(req.file.buffer);
      }

      // ✅ Ensure only unique fields are used
      const newArticle = new Article({
          title: req.body.title,
          description: req.body.description, // ✅ Only one instance of `description`
          text: req.body.text,
          date: req.body.date,
          image: imageUrl, 
          author: req.body.author,
          minToRead: req.body.minToRead,
          tag: req.body.tag,
      });

      const savedArticle = await newArticle.save();
      res.status(201).json(savedArticle);
  } catch (err) {
      console.error("❌ Error Saving Article:", err);
      res.status(500).json({ error: err.message });
  }
});


// GET: Articles by tag
router.get('/tag/:tag', async (req, res) => {
  try {
    const articles = await Article.find({ tag: req.params.tag });
    res.json(articles);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET: Retrieve all articles
router.get('/', async (req, res) => {
  try {
    const articles = await Article.find();
    res.json(articles);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET: Retrieve article by ID
router.get('/:id', async (req, res) => {
  try {
    const article = await Article.findById(req.params.id);
    if (!article) return res.status(404).json({ error: 'Article not found' });
    res.json(article);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE: Delete an article
router.delete('/:id',  async (req, res) => {
  try {
    const article = await Article.findById(req.params.id);
    if (!article) return res.status(404).json({ error: 'Article not found' });

    if (article.user.toString() !== req.user.id) {
      return res.status(403).json({ error: 'You can only delete your own articles' });
    }

    await Article.findByIdAndDelete(req.params.id);
    res.json({ message: 'Article deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
