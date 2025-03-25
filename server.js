require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const multer = require('multer');
const cohere = require('cohere-ai');

// Import routes
const articlesRoutes = require('./api/articles');
const eventsRoutes = require('./api/events');
const authRoutes = require('./api/auth');
const meetingsRoutes = require('./api/schedule');
const summarizeRoute = require('./api/summarize');
const aiPlagiarismRouter = require('./api/aiplagarism');
const sentimentanalysis=require('./api/sentimentComments')
// Create Express app
const app = express();

// ✅ Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ✅ Setup multer for handling file uploads (if needed globally)
const storage = multer.memoryStorage();
const upload = multer({ storage });

// ✅ Connect to MongoDB
const MONGODB_URI = process.env.MONGODB_URI;
mongoose.connect(MONGODB_URI)
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

// ✅ Use API routes
app.use('/api/articles', articlesRoutes);
app.use('/api/events', eventsRoutes);
app.use('/api/auth', authRoutes);

app.use('/api/schedule', meetingsRoutes);
// ...
app.use('/api/summarize', summarizeRoute); // New meetings route
app.use('/api/aiplagarism', aiPlagiarismRouter);
app.use('/api/sentimentComments',sentimentanalysis)

// ✅ Default route for testing
app.get('/', (req, res) => {
  res.send('Afterthoughts Backend API is running');
});

// ✅ Global Error Handling Middleware
app.use((err, req, res, next) => {
  console.error('❌ Error:', err.stack);
  res.status(500).json({ error: 'Internal Server Error' });
});

// ✅ Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

// ✅ Handle Uncaught Exceptions & Rejections
process.on("uncaughtException", (err) => {
  console.error("❌ Uncaught Exception:", err);
});

process.on("unhandledRejection", (err) => {
  console.error("❌ Unhandled Promise Rejection:", err);
});
