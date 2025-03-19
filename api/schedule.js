const express = require('express');
const Meeting = require('../models/meeting'); // Assuming the Meeting model is in models/meeting.js

const router = express.Router();

// POST route to book a meeting
router.post('/', async (req, res) => {
    try {
        const { userId, scheduledAt } = req.body;

        // Validate input
        if (!userId || !scheduledAt) {
            return res.status(400).json({ error: "User ID and scheduled time are required." });
        }

        // Create a new meeting
        const newMeeting = new Meeting({
            userId,
            scheduledAt,
            status: 'scheduled'
        });

        // Save the meeting to the database
        await newMeeting.save();

        // Respond with success
        res.status(201).json({ message: "Meeting booked successfully!" });
    } catch (err) {
        console.error("Error booking meeting:", err);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

module.exports = router;
