const express = require('express');
const router = express.Router();
const multer = require('multer');
const axios = require('axios');
const FormData = require('form-data');
const Event = require('../models/Event');
const authenticateUser = require('../middleware/auth'); // Import the authentication middleware
require('dotenv').config(); // To load environment variables

// Set up multer for memory storage (no local file storage)
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
});

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

// POST new event with an image upload
router.post('/', authenticateUser, upload.single('image'), async (req, res) => {
  try {
    let imageUrl = null;
    if (req.file) {
      imageUrl = await uploadToImgur(req.file.buffer); // Upload image and get the URL
    }

    const newEvent = new Event({
      ...req.body,
      imageUrl, // Store the URL of the uploaded image if there is one
      createdBy: req.user._id, // Associate event with the logged-in user
    });

    const savedEvent = await newEvent.save();
    res.status(201).json(savedEvent);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT update an event with an image upload
router.put('/:id', authenticateUser, upload.single('image'), async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    // Check if the logged-in user is the owner of the event
    if (event.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Not authorized to update this event' });
    }

    let imageUrl = null;
    if (req.file) {
      imageUrl = await uploadToImgur(req.file.buffer); // Upload image and get the URL
    }

    // Update the event with new details
    const updatedEvent = await Event.findByIdAndUpdate(
      req.params.id,
      {
        ...req.body,
        imageUrl: imageUrl || event.imageUrl, // Keep the old image URL if no new image is uploaded
      },
      { new: true }
    );

    res.json(updatedEvent);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
