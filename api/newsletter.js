const express = require('express');
const router = express.Router();
const Subscriber = require('../models/Subscribers');

router.post('/', async (req, res) => {
    console.log("📥 Received POST /api/newsletter", req.body);

  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  try {
    const existing = await Subscriber.findOne({ email });
    if (existing) {
      return res.status(400).json({ error: 'This email is already subscribed.' });
    }

    const subscriber = new Subscriber({ email });
    await subscriber.save();

    console.log("✅ Subscribed email:", email);
    res.status(200).json({ message: "Subscription successful!" });
  } catch (err) {
    console.error("❌ Subscription error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});
router.get('/ping', (req, res) => {
    res.send("pong");
  });
// POST route for general signup
router.post('/signup', async (req, res) => {
    const { email } = req.body;
  
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }
  
    try {
      const existing = await Subscriber.findOne({ email });
      if (existing) {
        return res.status(400).json({ error: 'Email already signed up.' });
      }
  
      const subscriber = new Subscriber({ email });
      await subscriber.save();
  
      console.log("✅ Signup email:", email);
      res.status(200).json({ message: "Thank you for signing up!" });
    } catch (err) {
      console.error("❌ Signup error:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  });
  
module.exports = router;
