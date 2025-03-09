const express = require('express');
const router = express.Router();
const multer = require('multer');
const axios = require('axios');
const FormData = require('form-data');
const Event = require('../models/Event');
const { verifyToken } = require('../middleware/authenticateUser'); // Ensure correct import
require('dotenv').config();

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
  const clientId = process.env.IMGUR_CLIENT_ID;
  if (!clientId) {
    throw new Error('Imgur Client ID is missing in environment variables.');
  }

  const base64Image = imageBuffer.toString('base64'); // Convert image to Base64
  const formData = new FormData();
  formData.append('image', base64Image);

  try {
    const response = await axios.post('https://api.imgur.com/3/upload', formData, {
      headers: {
        Authorization: `Client-ID ${clientId}`,
      },
    });
    return response.data.data.link; // Return the uploaded image URL
  } catch (err) {
    throw new Error('Failed to upload image to Imgur');
  }
};

// **POST: Create New Event**
router.post('/', upload.single('image'), async (req, res) => {
  try {
    let imageUrl = null;
    if (req.file) {
      imageUrl = await uploadToImgur(req.file.buffer); // Upload image and get URL
    }

    const newEvent = new Event({
      ...req.body,
      imageUrl,
      createdBy: req.user.userId, // Ensure userId is used correctly
    });

    const savedEvent = await newEvent.save();
    res.status(201).json(savedEvent);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// **PUT: Update Existing Event**
router.put('/:id', verifyToken, upload.single('image'), async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    // Ensure the user updating the event is the owner
    if (event.createdBy.toString() !== req.user.userId) {
      return res.status(403).json({ error: 'Not authorized to update this event' });
    }

    let imageUrl = event.imageUrl; // Default to existing image
    if (req.file) {
      imageUrl = await uploadToImgur(req.file.buffer);
    }

    const updatedEvent = await Event.findByIdAndUpdate(
      req.params.id,
      {
        ...req.body,
        imageUrl, // Update only if a new image is provided
      },
      { new: true }
    );

    res.json(updatedEvent);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
