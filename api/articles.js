const express = require('express');
const router = express.Router();
const Article = require('../models/Article');
const multer = require('multer');
const axios = require('axios');
const FormData = require('form-data');
const { verifyToken } = require('../middleware/authenticateUser');
require('dotenv').config();

// Multer setup for image uploads (memory storage)
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('File must be an image'), false);
    }
    cb(null, true);
  }
}).single('image');

// Function to upload image buffer to Imgur
const uploadToImgur = async (imageBuffer) => {
  const clientId = process.env.IMGUR_CLIENT_ID;
  const formData = new FormData();
  formData.append('image', imageBuffer.toString('base64'));

  try {
    const response = await axios.post('https://api.imgur.com/3/upload', formData, {
      headers: {
        ...formData.getHeaders(),
        Authorization: `Client-ID ${clientId}`,
      },
    });
    return response.data.data.link;
  } catch (err) {
    throw new Error('Failed to upload image to Imgur');
  }
};

// POST: Create a new article
router.post('/', verifyToken, upload, async (req, res) => {
  try {
    let imageUrl = null;
    if (req.file) {
      imageUrl = await uploadToImgur(req.file.buffer);
    }

    const newArticle = new Article({
      ...req.body,
      imageUrl,
      user: req.user.userId, // match JWT token payload
    });

    const savedArticle = await newArticle.save();
    res.status(201).json(savedArticle);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT: Update existing article
router.put('/:id', verifyToken, upload, async (req, res) => {
  try {
    const article = await Article.findById(req.params.id);
    if (!article) return res.status(404).json({ error: 'Article not found' });

    if (article.user.toString() !== req.user.userId) {
      return res.status(403).json({ error: 'You can only update your own articles' });
    }

    let imageUrl = article.imageUrl;
    if (req.file) {
      imageUrl = await uploadToImgur(req.file.buffer);
    }

    const updatedArticle = await Article.findByIdAndUpdate(
      req.params.id,
      {
        ...req.body,
        imageUrl,
      },
      { new: true }
    );

    res.json(updatedArticle);
  } catch (err) {
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
router.delete('/:id', verifyToken, async (req, res) => {
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
