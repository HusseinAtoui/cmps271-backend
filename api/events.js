const express = require('express');
const { authorizeRoles } = require('../middleware/authorize');
const router = express.Router();
const multer = require('multer');
const ImageKit = require('imagekit');
const Event = require('../models/Event');
require('dotenv').config();
const axios = require('axios');
const FormData = require('form-data');
const { verifyToken } = require('../middleware/authenticateUser');

// Setup ImageKit
const imagekit = new ImageKit({
  publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
  privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
  urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT,
});

// Multer for in-memory image upload
const upload = multer({ storage: multer.memoryStorage() });

// Function to upload image to ImageKit
const uploadToImageKit = async (fileBuffer, fileName) => {
  try {
    const response = await imagekit.upload({
      file: fileBuffer,
      fileName: fileName || "event_image.jpg",
    });
    return response.url; // Return ImageKit URL
  } catch (err) {
    console.error("❌ ImageKit Upload Error:", err.message);
    throw new Error("Failed to upload image.");
  }
};

// GET: Fetch all events
router.get('/', async (req, res) => {
  try {
    const events = await Event.find();
    res.json(events);
  } catch (err) {
    console.error("❌ Error fetching events:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST: Create a new event
router.post('/add', upload.single('image'),verifyToken, authorizeRoles('admin'), async (req, res) => {
  console.log("📩 Received event data:", req.body);
  
  let imageUrl = "https://ik.imagekit.io/default.png"; // Default placeholder image URL
  if (req.file) {
    imageUrl = await uploadToImageKit(req.file.buffer, req.file.originalname);
  }

  try {
    const newEvent = new Event({
      title: req.body.title,
      description: req.body.description,
      date: req.body.date, // ensure your frontend sends a valid date/time string
      image: imageUrl,
      details: req.body.details,
    });

    const savedEvent = await newEvent.save();
    console.log("✅ Event Created:", savedEvent);
    res.status(201).json(savedEvent);
  } catch (err) {
    console.error("❌ Error Saving Event:", err);
    res.status(500).json({ error: err.message });
  }
});

// PUT: Update an event
router.put('/:id', upload.single('image'),verifyToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ error: "Event not found" });
    }

    let imageUrl = event.image;
    if (req.file) {
      imageUrl = await uploadToImageKit(req.file.buffer, req.file.originalname);
    }

    const updatedEvent = await Event.findByIdAndUpdate(
      req.params.id,
      { 
        title: req.body.title || event.title,
        description: req.body.description || event.description,
        date: req.body.date || event.date,
        details: req.body.details || event.details,
        image: imageUrl,
      },
      { new: true }
    );

    res.json(updatedEvent);
  } catch (err) {
    console.error("❌ Error updating event:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// DELETE: Remove an event
router.delete('/:id',verifyToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ error: "Event not found" });
    }
    
    await Event.findByIdAndDelete(req.params.id);
    console.log("🗑️ Event deleted:", req.params.id);
    res.json({ message: "Event deleted successfully" });
  } catch (err) {
    console.error("❌ Error deleting event:", err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
