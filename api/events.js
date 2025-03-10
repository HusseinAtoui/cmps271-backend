const express = require('express');
const router = express.Router();
const multer = require('multer');
const axios = require('axios');
const FormData = require('form-data');
const Event = require('../models/Event');
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

// ✅ GET all events (No authentication required)
router.get('/', async (req, res) => {
  try {
    const events = await Event.find();
    res.json(events);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ GET a single event by ID (No authentication required)
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

// ✅ POST: Create a new event (No authentication required)
router.post('/', upload.single('image'),async (req, res) => {
  console.log("📩 Received event data:", req.body);
  let profilePictureUrl = "https://i.imgur.com/default.png"; // Default profile pic
  if (req.file) {
    profilePictureUrl = await uploadToImgur(req.file.buffer);
  }
  try {
    const newEvent = new Event({
      title: req.body.title,
      description: req.body.description,
      date: req.body.date,
      image: profilePictureUrl,
      details: req.body.details
    });

    const savedEvent = await newEvent.save();
    console.log("✅ Event Created:", savedEvent);
    res.status(201).json(savedEvent);
  } catch (err) {
    console.error("❌ Error Saving Event:", err);
    res.status(500).json({ error: err.message });
  }
});

// ✅ PUT: Update an event (No authentication required)
router.put('/:id', upload.single('image'), async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    let imageUrl = event.image;
    if (req.file) {
      imageUrl = await uploadToImgur(req.file.buffer);
    }

    const updatedEvent = await Event.findByIdAndUpdate(
      req.params.id,
      { 
        title: req.body.title || event.title,
        description: req.body.description || event.description,
        date: req.body.date || event.date,
        details: req.body.details || event.details,
        image: imageUrl
      },
      { new: true }
    );

    res.json(updatedEvent);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ DELETE: Delete an event (No authentication required)
router.delete('/:id', async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    
    if (!event) {
      return res.status(404).json({ error: "❌ Event not found" });
    }

    console.log("🗑️ DELETE Request for Event:", event);

    await Event.findByIdAndDelete(req.params.id);
    res.json({ message: "✅ Event deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
