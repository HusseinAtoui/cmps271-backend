const express = require('express');
const axios = require('axios');
const router = express.Router();

const HF_API_KEY = process.env.HUGGINGFACE_API_KEY;
const MAX_INPUT_LENGTH = 512;

router.post('/', async (req, res) => {
    try {
        if (!HF_API_KEY) {
            return res.status(500).json({ error: 'Missing Hugging Face API key' });
        }

        const { text } = req.body;
        if (!text || typeof text !== 'string') {
            return res.status(400).json({ error: 'Valid text required' });
        }

        const truncatedText = text.substring(0, MAX_INPUT_LENGTH);

        // Use correct model endpoint
        const response = await axios.post(
            'https://api-inference.huggingface.co/models/j-hartmann/emotion-english-distilroberta-base',
            { inputs: truncatedText },
            {
                headers: {
                    'Authorization': `Bearer ${HF_API_KEY}`, // Added closing backtick
    'Content-Type': 'application/json'
                },
        timeout: 20000// Increased timeout
            }
        );

        // Improved model loading handling
        if (response.data?.error) {
            if (response.data.error.includes('loading')) {
                const retryAfter = response.data.estimated_time || 15;
                console.log(`Model loading - retrying in ${retryAfter}s`);
                await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
                return this.huggingface(req, res);
            }
            throw new Error(response.data.error);
        }

        // Process new response format
        const emotions = response.data[0];
        const dominantEmotion = emotions.reduce((max, current) => 
            current.score > max.score ? current : max, 
            {score: 0}
        );

        res.json({
            sentiment: dominantEmotion.label,
            confidence: dominantEmotion.score,
            analyzedText: truncatedText.substring(0, 150),
            originalLength: text.length,
            analyzedLength: truncatedText.length,
            model: 'emotion-english-distilroberta-base'
        });

    } catch (error) {
        console.error('Hugging Face error:', error.response?.data || error.message);
        
        const statusCode = error.response?.status || 500;
        const errorMessage = error.response?.data?.error || 'Analysis failed';
        
        res.status(statusCode).json({
            error: errorMessage,
            ...(statusCode === 503 && { 
                advice: 'Model is loading, please try again in 15 seconds' 
            })
        });
    }
});

module.exports = router;