require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');


// Import routes
const articlesRoutes = require('./api/articles');
const eventsRoutes = require('./api/events');
const authRoutes = require('./api/auth');

// Create Express app
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Connect to MongoDB (update connection string as needed)
const MONGODB_URI = process.env.MONGODB_URI ;
mongoose.connect(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

// Use API routes
app.use('/api/articles', articlesRoutes);
app.use('/api/events', eventsRoutes);
app.use('/api/auth', authRoutes);

// Default route for testing
app.get('/', (req, res) => {
  res.send('Afterthoughts Backend API is running');
});

// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
