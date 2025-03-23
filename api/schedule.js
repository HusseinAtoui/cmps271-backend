const express = require('express');
const { createEvent } = require('ics');
const Meeting = require('../models/Meetings');
const nodemailer = require('nodemailer');
const router = express.Router();

// Configure your transporter (example using Gmail)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,   // Your email address from .env
    pass: process.env.EMAIL_PASS    // Your email password or app-specific password from .env
  }
});

// POST route to book a meeting and send a calendar invite email to both parties
router.post('/', async (req, res) => {
  try {
    const { name, email, meetingDate, message } = req.body;

    // Validate required fields
    if (!name || !email || !meetingDate) {
      return res.status(400).json({ error: "Name, email, and meeting date are required." });
    }

    // Parse the meetingDate (assumes input in ISO format from a datetime-local input)
    const dateObj = new Date(meetingDate);
    if (isNaN(dateObj.getTime())) {
      return res.status(400).json({ error: "Invalid meeting date." });
    }

    // Build the start date array for the ICS event.
    // Note: The month value in JavaScript Date is 0-based, so add 1.
    const eventStart = [
      dateObj.getFullYear(),
      dateObj.getMonth() + 1,
      dateObj.getDate(),
      dateObj.getHours(),
      dateObj.getMinutes()
    ];

    // Create the event details for the ICS invite
    const event = {
      start: eventStart,
      duration: { hours: 1 },
      title: 'Meeting Scheduled',
      description: message || "No additional message provided",
      location: 'Online Meeting',
      // The organizer field typically reflects the meeting creator.
      organizer: { name: name, email: email }
    };

    // Generate the ICS content
    createEvent(event, async (error, value) => {
      if (error) {
        console.error("Error creating ICS event:", error);
        return res.status(500).json({ error: "Failed to create calendar invite." });
      }

      // Optionally save the meeting to your database
      const newMeeting = new Meeting({
        name: name,
        email: email,
        scheduledAt: meetingDate,
        message: message,
        status: 'scheduled'
      });
      await newMeeting.save();

      // Prepare the email options:
      // We send the email to both the meeting creator (user) and the editor.
      // You can change the editor's email address as needed.
      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: `${email}, czz01@mail.aub.edu`, // Send to both parties (separated by commas)
        subject: 'New Meeting Scheduled',
        text: `A new meeting has been scheduled by ${name}. Please see the attached invite.`,
        attachments: [{
          filename: 'invite.ics',
          content: value,
          contentType: 'text/calendar'
        }]
      };

      // Send the email
      transporter.sendMail(mailOptions, (err, info) => {
        if (err) {
          console.error("Error sending invite email:", err);
          return res.status(500).json({ error: "Failed to send invite email." });
        }
        res.status(201).json({ message: "Meeting booked and invite email sent successfully!" });
      });
    });
  } catch (err) {
    console.error("Error booking meeting:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// GET route to fetch all meetings (for display purposes)
router.get('/', async (req, res) => {
  try {
    console.log("✅ Incoming request to GET /api/schedule");
    const meetings = await Meeting.find();
    console.log("📌 Meetings fetched:", meetings);
    res.json(meetings);
  } catch (err) {
    console.error("❌ Error fetching meetings:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});module.exports = router;
