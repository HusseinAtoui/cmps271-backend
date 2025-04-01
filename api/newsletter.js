const express = require('express');
const router = express.Router();

// POST endpoint for subscribing to the newsletter
router.post('/', (req, res) => {
    const { email } = req.body;
    if (!email) {
        return res.status(400).json({ error: 'Email is required' });
    }
    try {
        // Simulated successful action
        console.log("Subscribed email:", email);
        res.status(200).json({ message: "Subscription successful!" });
    } catch (error) {
        console.error("Subscription error:", error);
        res.status(500).json({ error: "Error processing subscription" });
    }
});



module.exports = router;
