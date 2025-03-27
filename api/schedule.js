api\schedule.js
@@ -1,5 +1,5 @@
const express = require('express');
const Meeting = require('../models/meeting');
const Meeting = require('../models/Meetings');

const router = express.Router();



@@ -27,6 +27,18 @@ router.post('/', async (req, res) => {
        console.error("Error booking meeting:", err);
        res.status(500).json({ error: "Internal Server Error" });
    }
});router.get('/', async (req, res) => {
    try {
        console.log("✅ Incoming request to GET /api/schedule"); // Debug log
        const meetings = await Meeting.find();
        console.log("📌 Meetings fetched:", meetings); // Log fetched data
        res.json(meetings);
    } catch (err) {
        console.error("❌ Error fetching meetings:", err);
        res.status(500).json({ error: "Internal Server Error" });
    }
});



module.exports = router;