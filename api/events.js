const express = require('express');
const router = express.Router();
const multer = require('multer');
const axios = require('axios');
const FormData = require('form-data');
const Event = require('../models/Event');
<<<<<<< Updated upstream
<<<<<<< Updated upstream
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
=======
const authenticateUser = require('../middleware/auth'); // Authentication middleware
require('dotenv').config(); // Load environment variables

// Multer setup for memory storage (no local file storage)
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
>>>>>>> Stashed changes
=======
const authenticateUser = require('../middleware/auth'); // Authentication middleware
require('dotenv').config(); // Load environment variables

// Multer setup for memory storage (no local file storage)
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
>>>>>>> Stashed changes
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('File must be an image'), false);
    }
    cb(null, true);
  }
});

<<<<<<< Updated upstream
<<<<<<< Updated upstream
// Upload image to Imgur
const uploadToImgur = async (imageBuffer) => {
  const clientId = process.env.IMGUR_CLIENT_ID;
  if (!clientId) {
    throw new Error('Imgur Client ID is missing in environment variables.');
  }

  const base64Image = imageBuffer.toString('base64');
=======
// Function to upload image to Imgur
const uploadToImgur = async (imageBuffer) => {
  const clientId = process.env.IMGUR_CLIENT_ID; // Imgur Client ID from .env file
>>>>>>> Stashed changes
=======
// Function to upload image to Imgur
const uploadToImgur = async (imageBuffer) => {
  const clientId = process.env.IMGUR_CLIENT_ID; // Imgur Client ID from .env file
>>>>>>> Stashed changes
  const formData = new FormData();
  formData.append('image', base64Image);

  try {
    const response = await axios.post('https://api.imgur.com/3/upload', formData, {
      headers: {
        Authorization: `Client-ID ${clientId}`,
      },
    });
<<<<<<< Updated upstream
    return response.data.data.link;
=======

    return response.data.data.link; // Return Imgur image URL
<<<<<<< Updated upstream
>>>>>>> Stashed changes
=======
>>>>>>> Stashed changes
  } catch (err) {
    throw new Error('Failed to upload image to Imgur');
  }
};

<<<<<<< Updated upstream
<<<<<<< Updated upstream
// **POST: Create New Event**
router.post('/', upload.single('image'), async (req, res) => {
=======
// ✅ GET all events
router.get('/', async (req, res) => {
  try {
    const events = await Event.find();
    res.json(events);
=======
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
      return res.status(404).json({ error: 'Event not found' });
    }
    res.json(event);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ POST a new event with an image upload
router.post('/', authenticateUser, upload.single('image'), async (req, res) => {
  try {
    let imageUrl = null;
    if (req.file) {
      imageUrl = await uploadToImgur(req.file.buffer); // Upload image and get URL
    }

    const newEvent = new Event({
      title: req.body.title,
      image: imageUrl, // Store the image URL
      description: req.body.description,
      date: req.body.date,
      details: req.body.details,
      createdBy: req.user._id, // Associate event with the logged-in user
    });

    const savedEvent = await newEvent.save();
    res.status(201).json(savedEvent);
>>>>>>> Stashed changes
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

<<<<<<< Updated upstream
// ✅ GET a single event by ID
router.get('/:id', async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }
    res.json(event);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ POST a new event with an image upload
router.post('/', authenticateUser, upload.single('image'), async (req, res) => {
>>>>>>> Stashed changes
  try {
    let imageUrl = null;
    if (req.file) {
      imageUrl = await uploadToImgur(req.file.buffer); // Upload image and get URL
    }

<<<<<<< Updated upstream
try{
      const newEvent = new Event({
          title: req.body.title,
          description: req.body.description,
          date: req.body.date,
          image: req.body.image || "default.jpg", // Ensure image exists
          details: req.body.details
      });
=======
    const newEvent = new Event({
      title: req.body.title,
      image: imageUrl, // Store the image URL
      description: req.body.description,
      date: req.body.date,
      details: req.body.details,
      createdBy: req.user._id, // Associate event with the logged-in user
    });
>>>>>>> Stashed changes

      const savedEvent = await newEvent.save();
      res.status(201).json(savedEvent);
  } catch (err) {
      console.error("❌ Error saving event:", err);
      res.status(500).json({ error: err.message });
  }
}
);

<<<<<<< Updated upstream

// ✅ DELETE an event
router.delete('/:id', async (req, res) => {
    try {
        await Event.findByIdAndDelete(req.params.id);
        res.json({ message: "Event deleted successfully" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
=======
=======
>>>>>>> Stashed changes
// ✅ DELETE an event by ID
router.delete('/:id', authenticateUser, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    // Ensure only the event creator can delete it
    if (event.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Not authorized to delete this event' });
    }

    await Event.findByIdAndDelete(req.params.id);
    res.json({ message: 'Event deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
>>>>>>> Stashed changes
});

module.exports = router;
