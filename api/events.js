const express = require('express');
const router = express.Router();
const multer = require('multer');
const axios = require('axios');
const FormData = require('form-data');
const Event = require('../models/Event');
const { verifyToken } = require('../middleware/authenticateUser'); 
require('dotenv').config();

// ✅ Multer setup for memory storage (storing images in memory before upload)
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

// ✅ Function to upload image to Imgur
const uploadToImgur = async (imageBuffer) => {
  const clientId = process.env.IMGUR_CLIENT_ID;
  if (!clientId) {
    throw new Error('Imgur Client ID is missing in environment variables.');
  }

  const formData = new FormData();
  formData.append('image', imageBuffer.toString('base64'));

  try {
    const response = await axios.post('https://api.imgur.com/3/upload', formData, {
      headers: {
        Authorization: `Client-ID ${clientId}`,
      },
    });

    return response.data.data.link; // ✅ Return uploaded image URL
  } catch (err) {
    throw new Error('Failed to upload image to Imgur');
  }
};

// ✅ GET all events
router.get('/', verifyToken, async (req, res) => {
  try {
    const events = await Event.find();
    res.json(events);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ GET a single event by ID
router.get('/:id', verifyToken,async (req, res) => {
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

// ✅ POST: Create a new event (Only Authenticated Users)
router.post('/', verifyToken, async (req, res) => {
  console.log("📩 Received event data:", req.body);

  try {
    // Ensure the event always has a createdBy field
    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: "Unauthorized: No user ID found" });
    }

    const newEvent = new Event({
      title: req.body.title,
      description: req.body.description,
      date: req.body.date,
      image: req.body.image || "default.jpg",
      details: req.body.details,
      createdBy: req.user.id // ✅ Ensure createdBy is always set
    });

    const savedEvent = await newEvent.save();
    console.log("✅ Event Created:", savedEvent);
    res.status(201).json(savedEvent);
  } catch (err) {
    console.error("❌ Error Saving Event:", err);
    res.status(500).json({ error: err.message });
  }
});


// ✅ PUT: Update an event (Only the creator can update)
router.put('/:id', verifyToken, upload, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    if (event.createdBy.toString() !== req.user.id) {
      return res.status(403).json({ error: 'You are not authorized to update this event' });
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

// ✅ DELETE: Delete an event (Only the creator can delete)
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    
    if (!event) {
      return res.status(404).json({ error: "❌ Event not found" });
    }

    console.log("🗑️ DELETE Request for Event:", event);

    if (!event.createdBy) {
      return res.status(400).json({ error: "❌ Event is missing 'createdBy' field. Fix required!" });
    }

    if (event.createdBy.toString() !== req.user.id) {
      return res.status(403).json({ error: '❌ Not authorized to delete this event' });
    }

    await Event.findByIdAndDelete(req.params.id);
    res.json({ message: "✅ Event deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});



module.exports = router;
