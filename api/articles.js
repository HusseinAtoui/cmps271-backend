const express = require('express');
const router = express.Router();
const Article = require('../models/Article');
const multer = require('multer');
const axios = require('axios');
const FormData = require('form-data');
require('dotenv').config(); // Import environment variables

// Import the authentication middleware's verifyToken function from authenticate.js
const { verifyToken } = require('../middleware/authenticateUser');

// Set up multer to store image in memory (no local storage)
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // Limit file size to 5MB
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('File must be an image'), false);
    }
    cb(null, true);
  }
}).single('image');

// Function to upload the image to Imgur
const uploadToImgur = async (imageBuffer) => {
  const clientId = process.env.IMGUR_CLIENT_ID; // Get the client ID from .env file

  const formData = new FormData();
  formData.append('image', imageBuffer);

  try {
    const response = await axios.post('https://api.imgur.com/3/upload', formData, {
      headers: {
        ...formData.getHeaders(),
        Authorization: `Client-ID ${clientId}`,
      },
    });
    return response.data.data.link; // Return the URL of the uploaded image
  } catch (err) {
    throw new Error('Failed to upload image to Imgur');
  }
};

// POST a new article with image upload
router.post('/', verifyToken, upload, async (req, res) => {
  try {
    let imageUrl = null;
    if (req.file) {
      imageUrl = await uploadToImgur(req.file.buffer); // Upload image and get the URL
    }

    const newArticle = new Article({
      ...req.body,
      imageUrl,         // Store the URL of the uploaded image
      user: req.user.id // Attach the user who created the article
    });

    const savedArticle = await newArticle.save();
    res.status(201).json(savedArticle);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT update an existing article with image upload
router.put('/:id', verifyToken, upload, async (req, res) => {
  try {
    const article = await Article.findById(req.params.id);
    if (!article) {
      return res.status(404).json({ error: 'Article not found' });
    }

    // Ensure that the user updating the article is the one who created it
    if (article.user.toString() !== req.user.id) {
      return res.status(403).json({ error: 'You can only update your own articles' });
    }

    let imageUrl = article.imageUrl; // Keep existing image URL if no new image uploaded
    if (req.file) {
      imageUrl = await uploadToImgur(req.file.buffer); // Upload new image and get the URL
    }

    const updatedArticle = await Article.findByIdAndUpdate(
      req.params.id,
      {
        ...req.body,
        imageUrl, // Update the image URL
      },
      { new: true }
    );

    res.json(updatedArticle);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET articles by tag
router.get('/tag/:tag', async (req, res) => {
  try {
    const articles = await Article.find({ tag: req.params.tag });
    res.json(articles);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET all articles
router.get('/', async (req, res) => {
  try {
    const articles = await Article.find({});
    res.json(articles);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET a single article by ID
router.get('/:id', async (req, res) => {
  try {
    const article = await Article.findById(req.params.id);
    if (!article) return res.status(404).json({ error: 'Article not found' });
    res.json(article);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE an article
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const article = await Article.findById(req.params.id);
    if (!article) return res.status(404).json({ error: 'Article not found' });

    // Ensure that the user deleting the article is the one who created it
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
