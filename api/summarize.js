const express = require('express');
const axios = require('axios');
const router = express.Router();

const COHERE_API_KEY = process.env.COHERE_API_KEY || 'l7mdBWEWPXLm66h517Y6P2bQPPJRWZdzLTkZPnUX';

router.post('/', async (req, res) => {
    console.log("Incoming request body:", req.body); // Fixed logging

    const { text } = req.body; // Correct destructuring
    if (!text) {
        return res.status(400).json({ error: 'Text is required' });
    }

    try {
        const response = await axios.post(
            'https://api.cohere.ai/generate',
            {
                model: 'command',
                prompt: `Summarize the following text in a short paragraph:\n\n${text}\n\nSummary:`,
                max_tokens: 100,
                temperature: 0.3
            },
            {
                headers: {
                    'Authorization': `Bearer ${COHERE_API_KEY}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        // Updated response handling
        if (!response.data.text) {
            console.error("Invalid response format:", response.data);
            return res.status(500).json({ error: 'Invalid response from API' });
        }

        const summary = response.data.text.trim();
        res.json({ summary });
    } catch (error) {
        console.error('Error generating summary:', error.response?.data || error);
        res.status(500).json({ error: 'Failed to generate summary' });
    }
});

module.exports = router;