const express = require('express');
const Meeting = require('../models/meeting');

const router = express.Router();

// POST route to book a meeting
router.post('/', async (req, res) => {
    try {
        const { name, email, meetingDate, message } = req.body;

        if (!name || !email || !meetingDate) {
            return res.status(400).json({ error: "Name, email, and scheduled time are required." });
        }

        const newMeeting = new Meeting({
            userId: email,  // Storing email instead of ObjectId
            scheduledAt: meetingDate,
            name: name,
            message: message,
            status: 'scheduled'
        });

        await newMeeting.save();

        res.status(201).json({ message: "Meeting booked successfully!" });
    } catch (err) {
        console.error("Error booking meeting:", err);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

module.exports = router;
