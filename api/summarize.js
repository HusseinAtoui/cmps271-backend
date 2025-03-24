require('dotenv').config();
const express = require('express');
const cohere = require('cohere-ai');

if (!process.env.COHERE_API_KEY) {
  console.error("❌ Error: COHERE_API_KEY not found in environment variables.");
  process.exit(1);
}

// ✅ Set Cohere API Key
cohere.apiKey = process.env.COHERE_API_KEY;

const router = express.Router();

// ✅ Function to generate summary
const generateSummaryCohere = async (text) => {
  try {
    const response = await cohere.summarize({
      text,
      length: "medium",       // Options: short, medium, long
      format: "paragraph",    // Options: bullet, paragraph
      extractiveness: "low",  // Options: low, medium, high
    });
    return response.body.summary;
  } catch (error) {
    console.error("❌ Cohere API Error:", error);
    throw new Error("Failed to generate summary.");
  }
};

// ✅ API Route for frontend requests at the root of /api/summarize
router.put('/', async (req, res) => {
  const { text } = req.body;
  if (!text) {
    return res.status(400).json({ error: "Text is required for summarization." });
  }
  try {
    const summary = await generateSummaryCohere(text);
    res.json({ summary });
  } catch (error) {
    res.status(500).json({ error: "Error generating summary." });
  }
});

// ✅ Export the router directly
module.exports = router;
