require('dotenv').config(); // Ensure .env is loaded
const express = require('express');
const axios = require('axios');
const router = express.Router();

const HUGGINGFACE_API_TOKEN = process.env.HUGGINGFACE_API_TOKEN;
const MODEL_NAME = process.env.HUGGINGFACE_MODEL || 'roberta-large-openai-detector';



router.post('/detect', async (req, res) => {
    const { text } = req.body;
    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }
  
    if (!HUGGINGFACE_API_TOKEN) {
      console.error("ERROR: Hugging Face API token is missing.");
      return res.status(500).json({ error: 'Missing Hugging Face API token. Check environment variables.' });
    }
  
    try {
      console.log("🔍 Detecting AI-generated content using Hugging Face...");
  
      // Call the Hugging Face Inference API with the chosen model
      const response = await axios.post(
        `https://api-inference.huggingface.co/models/${MODEL_NAME}`,
        { inputs: text },
        {
          headers: {
            'Authorization': `Bearer ${HUGGINGFACE_API_TOKEN}`,
            'Content-Type': 'application/json'
          }
        }
      );
  
      // Process the API response to extract the most likely label
      const result = response.data;
      const predictions = result[0]; // get the inner array if your result is nested
      const bestPrediction = predictions.reduce((prev, curr) => (curr.score > prev.score ? curr : prev));
      console.log("Most likely label:", bestPrediction.label, "with score:", bestPrediction.score);
  
      // Optionally, you could send back only the best prediction to the client
      return res.json({
        bestLabel: bestPrediction.label,
        score: bestPrediction.score
      });
    } catch (error) {
      console.error("❌ Error detecting AI-generated content:", error.response?.data || error.message);
      return res.status(500).json({ error: 'Failed to analyze text' });
    }
  });
  
module.exports = router;
