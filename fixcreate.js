require('dotenv').config();
const mongoose = require('mongoose');
const Event = require('./models/Event'); // Adjust if needed

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    console.log("✅ Connected to MongoDB");

    const eventId = "67cdb568ffbf7af98c888414"; // The event you want to fix
    const userId = "PUT_YOUR_USER_ID_HERE"; // Replace with a valid user ID

    const updatedEvent = await Event.findByIdAndUpdate(eventId, { createdBy: userId }, { new: true });

    if (updatedEvent) {
      console.log("✅ Successfully updated event:", updatedEvent);
    } else {
      console.log("❌ Event not found.");
    }

    mongoose.connection.close();
  })
  .catch(err => console.error("❌ MongoDB Connection Error:", err));
