const express = require('express');
const { google } = require('googleapis');
const Meeting = require('../models/Meetings');
const nodemailer = require('nodemailer');
const router = express.Router();
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

oauth2Client.setCredentials({
  refresh_token: process.env.GOOGLE_REFRESH_TOKEN
});

const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

// Configure email transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// POST route to book a meeting and send a Google Meet invite
router.post('/', async (req, res) => {
  try {
    const { name, email, meetingDate, message } = req.body;

    if (!name || !email || !meetingDate) {
      return res.status(400).json({ error: "Name, email, and meeting date are required." });
    }

    const dateObj = new Date(meetingDate);
    if (isNaN(dateObj.getTime())) {
      return res.status(400).json({ error: "Invalid meeting date." });
    }

    // Create Google Calendar Event with Google Meet link
    const event = {
      summary: 'Meeting Scheduled',
      description: message || "No additional message provided",
      start: { dateTime: dateObj.toISOString(), timeZone: 'Asia/Beirut' },
      end: { dateTime: new Date(dateObj.getTime() + 60 * 60 * 1000).toISOString(), timeZone: 'Asia/Beirut' },
      attendees: [{ email: email }],
      conferenceData: { createRequest: { requestId: `${Date.now()}` } }
    };

    const response = await calendar.events.insert({
      calendarId: 'primary',
      resource: event,
      conferenceDataVersion: 1
    });

    const meetLink = response.data.hangoutLink;

    // Save the meeting to the database
    const newMeeting = new Meeting({
      name,
      email,
      scheduledAt: meetingDate,
      message,
      meetLink,
      status: 'scheduled'
    });
    await newMeeting.save();

    // Email the invite
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: '${email}',
      subject: 'New Meeting Scheduled - Google Meet',
      text: `Hello ${name},\n\nYour meeting is scheduled.\n\nJoin here: ${meetLink}\n\nMessage: ${message || "No additional message provided."}`,
    };

    await transporter.sendMail(mailOptions);

    res.status(201).json({ message: "Meeting booked and Google Meet invite sent successfully!", meetLink });

  } catch (err) {
    console.error("Error booking meeting:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// GET route to fetch all meetings
router.get('/', async (req, res) => {
  try {
    const meetings = await Meeting.find();
    res.json(meetings);
  } catch (err) {
    console.error("Error fetching meetings:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = router;
 