const mongoose = require('mongoose');
const Event = require('./models/Event'); // Adjust path if needed
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });

async function fixEvents() {
    try {
        const userId = "67cd8816fde5930ccff63c1c"; // Replace with your actual user ID

        const events = await Event.find({ createdBy: { $exists: false } });

        if (events.length === 0) {
            console.log("✅ No events needed fixing.");
            mongoose.connection.close();
            return;
        }

        for (const event of events) {
            event.createdBy = userId;
            await event.save();
            console.log(`✅ Fixed Event ID: ${event._id} (added createdBy)`);
        }

        console.log("✅ All missing 'createdBy' fields have been fixed.");
        mongoose.connection.close();
    } catch (err) {
        console.error("❌ Error fixing events:", err);
        mongoose.connection.close();
    }
}

fixEvents();
