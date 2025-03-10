require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const multer = require('multer'); // ✅ Import multer
const Event = require('./models/Event'); // ✅ Correct import


// Import routes
const articlesRoutes = require('./api/articles');
const eventsRoutes = require('./api/events');
const authRoutes = require('./api/auth');

// Create Express app
const app = express();

// ✅ Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // ✅ Allow form-data uploads

// ✅ Setup multer for handling file uploads
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Connect to MongoDB
const MONGODB_URI = process.env.MONGODB_URI;
mongoose.connect(MONGODB_URI)
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

// ✅ Use API routes
app.use('/api/articles', articlesRoutes);
app.use('/api/events', eventsRoutes);
app.use('/api/auth', authRoutes);

// ✅ Default route for testing
app.get('/', (req, res) => {
  res.send('Afterthoughts Backend API is running');
});

// ✅ Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
process.on("uncaughtException", (err) => {
  console.error("❌ Uncaught Exception:", err);
});

process.on("unhandledRejection", (err) => {
  console.error("❌ Unhandled Promise Rejection:", err);
});
app.get('/fix-event', async (req, res) => {
  try {
    const fixedEvent = await Event.findByIdAndUpdate(
      "67cdb568ffbf7af98c888414", // Event ID
      { $set: { createdBy: "67cd8816fde5930ccff63c1c" } }, // Your admin user ID
      { new: true }
    );

    if (!fixedEvent) {
      return res.status(404).json({ error: "❌ Event not found" });
    }

    res.json({ message: "✅ Event fixed!", event: fixedEvent });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
