const express = require('express');
const router = express.Router();
const multer = require('multer');
const axios = require('axios');
const FormData = require('form-data');
const Event = require('../models/Event');
const { verifyToken } = require('../middleware/authenticateUser'); 
require('dotenv').config();

// ✅ GET all events
router.get('/', async (req, res) => {
    try {
        const events = await Event.find();
        res.json(events);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ✅ GET a single event by ID
router.get('/:id', async (req, res) => {
    try {
        const event = await Event.findById(req.params.id);
        if (!event) {
            return res.status(404).json({ error: "Event not found" });
        }
        res.json(event);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ✅ POST: Create a new event
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, 
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('File must be an image'), false);
    }
    cb(null, true);
  }
});

// Upload image to Imgur
const uploadToImgur = async (imageBuffer) => {
  const clientId = process.env.IMGUR_CLIENT_ID;
  if (!clientId) {
    throw new Error('Imgur Client ID is missing in environment variables.');
  }

  const base64Image = imageBuffer.toString('base64');
  const formData = new FormData();
  formData.append('image', base64Image);

  try {
    const response = await axios.post('https://api.imgur.com/3/upload', formData, {
      headers: {
        Authorization: `Client-ID ${clientId}`,
      },
    });
    return response.data.data.link;
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

try{
      const newEvent = new Event({
          title: req.body.title,
          description: req.body.description,
          date: req.body.date,
          image: req.body.image || "default.jpg", // Ensure image exists
          details: req.body.details
      });

      const savedEvent = await newEvent.save();
      res.status(201).json(savedEvent);
  } catch (err) {
      console.error("❌ Error saving event:", err);
      res.status(500).json({ error: err.message });
  }
}
);


// ✅ DELETE an event
router.delete('/:id', async (req, res) => {
    try {
        await Event.findByIdAndDelete(req.params.id);
        res.json({ message: "Event deleted successfully" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
