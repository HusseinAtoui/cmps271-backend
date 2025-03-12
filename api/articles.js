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

// ✅ Get all articles
router.get('/', async (req, res) => {
  try {
    const articles = await Article.find();
    res.json(articles);
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

// ✅ Create a new article
router.post('/add', upload.single('image'), async (req, res) => {
  try {
    console.log("📩 Received event data:", req.body);
    let picUrl = "https://i.imgur.com/default.png"; // Default profile pic
    if (req.file) {
      picUrl = await uploadToImgur(req.file.buffer);
    }

    const newArticle = new Article({
      title: req.body.title,
      image: picUrl,
      description: req.body.description,
      date: req.body.date,
      text: req.body.text,
      author: req.body.author,
      minToRead: req.body.minToRead,
      tag: req.body.tag
    });

    const savedArticle = await newArticle.save();
    res.status(201).json(savedArticle);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ Update an existing article by ID
router.put('/update/:id', upload.single('image'), async (req, res) => {
  try {
    console.log("📩 Received Data:", req.body);
    console.log("🖼️ Received File:", req.file); // ✅ Debugging

    let imageUrl = undefined; // Keep the existing image if no new image is provided
    if (req.file) {
      imageUrl = await uploadToImgur(req.file.buffer);
    }

    const updatedArticle = await Article.findByIdAndUpdate(
      req.params.id,
      {
        title: req.body.title,
        description: req.body.description,
        text: req.body.text,
        date: req.body.date,
        image: imageUrl || req.body.image, // Keep old image if no new upload
        author: req.body.author,
        minToRead: req.body.minToRead,
        tag: req.body.tag,
      },
      { new: true } // ✅ Return updated document
    );

    if (!updatedArticle) return res.status(404).json({ error: "Article not found" });

    res.status(200).json(updatedArticle);
  } catch (err) {
    console.error("❌ Error Updating Article:", err);
    res.status(500).json({ error: err.message });
  }
});

// ✅ Get articles by tag
router.get('/tag/:tag', async (req, res) => {
  try {
    const articles = await Article.find({ tag: req.params.tag });
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
