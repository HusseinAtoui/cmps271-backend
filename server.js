require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const multer = require('multer');
const cohere = require('cohere-ai');
const session = require('express-session'); // <-- Added
const passport = require('passport'); // <-- Added

// Import routes
const articlesRoutes = require('./api/articles');
const eventsRoutes = require('./api/events');
const authRoutes = require('./api/auth');
const meetingsRoutes = require('./api/schedule');
const summarizeRoute = require('./api/summarize');
const aiPlagiarismRouter = require('./api/aiplagarism');
const sentimentanalysis = require('./api/sentimentComments');
const user = require('./api/users');
const contactRoute = require('./api/contact');
const subscribeRouter = require('./api/newsletter');
const seleniumrouter=require('./api/seleniumTest');
const quotesRoutes = require('./api/quotes')

// Create Express app
const app = express();

// ✅ Middleware
app.use(cors({
  origin: "https://husseinatoui.github.io",
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ✅ Add session support for Passport
app.use(session({
  secret: 'your_secret_key', // Replace with a strong secret, ideally from your env variables
  resave: false,
  saveUninitialized: false
}));

// ✅ Initialize Passport middleware (with sessions)
app.use(passport.initialize());
app.use(passport.session());

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
app.use('/api/summarize', summarizeRoute); // New meetings route
app.use('/api/aiplagarism', aiPlagiarismRouter);
app.use('/api/sentimentComments', sentimentanalysis);
app.use('/api/users', user);
app.use('/api/contact', contactRoute);
app.use('/api/newsletter', subscribeRouter);
app.use('/api/seleniumTest',seleniumrouter);
app.use('/api/quotes', quotesRoutes);


app.get('/api/recommend/:slug', async (req, res) => {
  const { slug } = req.params;
  const k = req.query.k || 5;

  try {
    const { data } = await axios.get(
      `${recServiceURL}/recommend/${encodeURIComponent(slug)}?k=${k}`
    );
    res.json(data);
  } catch (error) {
    console.error('[recommend] error:', error.message);
    res.status(500).json({ error: 'Recommendation service unavailable' });
  }
}); 

// ✅ Default route for testing
app.get('/', (req, res) => {
  res.send('Afterthoughts Backend API is running');
});


// ✅ Handle Uncaught Exceptions & Rejections
process.on("uncaughtException", (err) => {
  console.error("❌ Uncaught Exception:", err);
});

process.on("unhandledRejection", (err) => {
  console.error("❌ Unhandled Promise Rejection:", err);
});

app.use((err, req, res, next) => {
  console.error('❌ Error:', err.stack);
  res.status(500).json({ error: 'Internal Server Error' });
});

// ✅ Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
