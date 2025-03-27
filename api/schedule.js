const express = require('express');
const { createEvent } = require('ics');
const nodemailer = require('nodemailer');
const Meeting = require('../models/Meetings'); // Ensure case matches actual file name

const router = express.Router();

// Email transporter setup
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

router.post('/', async (req, res) => {
  try {
    const { name, email, meetingDate, message } = req.body;
    
    // Validation
    if (!name || !email || !meetingDate) {
      return res.status(400).json({ error: "Name, email, and meeting date are required." });
    }

    // Fix 1: Create Date object from meetingDate
    const dateObj = new Date(meetingDate);
    if (isNaN(dateObj.getTime())) {
      return res.status(400).json({ error: "Invalid date format" });
    }

    // Create calendar event
    const eventStart = [
      dateObj.getUTCFullYear(),
      dateObj.getUTCMonth() + 1,
      dateObj.getUTCDate(),
      dateObj.getUTCHours(),
      dateObj.getUTCMinutes()
    ];

    const event = {
      start: eventStart,
      duration: { hours: 1 },
      title: 'Meeting Scheduled',
      description: message || "No additional message provided",
      location: 'Online Meeting',
      organizer: { name: name, email: email }
    };

    // Create meeting in database
    const newMeeting = new Meeting({
      name: name,
      email: email,
      scheduledAt: dateObj,
      message: message,
      status: 'scheduled'
    });
    
    await newMeeting.save();

    // Generate ICS file
    createEvent(event, async (error, value) => {
      if (error) {
        console.error("ICS Error:", error);
        return res.status(500).json({ error: "Failed to create calendar invite" });
      }

      // Send email
      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: `${email}`,
        subject: 'New Meeting Scheduled',
        text: `Meeting details:\nName: ${name}\nDate: ${dateObj.toISOString()}\nMessage: ${message || 'None'}`,
        attachments: [{
          filename: 'invite.ics',
          content: value,
          contentType: 'text/calendar'
        }]
      };

      transporter.sendMail(mailOptions, (err, info) => {
        if (err) {
          console.error("Email Error:", err);
          return res.status(500).json({ error: "Failed to send email" });
        }
        res.status(201).json({ 
          message: "Meeting booked successfully!",
          meeting: newMeeting,
          emailStatus: info.response
        });
      });
    });

  } catch (err) {
    console.error("Server Error:", err);
    res.status(500).json({ error: err.message || "Internal Server Error" });
  }
});

router.get('/', async (req, res) => {
  try {
    const meetings = await Meeting.find().sort({ scheduledAt: -1 });
    res.json(meetings);
  } catch (err) {
    console.error("Fetch Error:", err);
    res.status(500).json({ error: "Failed to fetch meetings" });
  }
});

module.exports = router;