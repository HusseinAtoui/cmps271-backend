// api/quotes.js
const express = require('express');
const axios = require('axios');

// Create a router for the quotes API
const router = express.Router();

router.get('/', async (req, res) => {
    try {
        const response = await axios.get('https://zenquotes.io/api/random');

        // Validate response structure
        if (!response.data?.[0]?.q || !response.data?.[0]?.a) {
            throw new Error('Invalid quote API response');
        }

        res.json({
            quote: response.data[0].q,
            author: response.data[0].a
        });
    } catch (error) {
        console.error('Error fetching quote:', error);
        res.status(500).json({
            error: 'Failed to fetch quote',
            fallback: {
                quote: "The journey of a thousand miles begins with one step.",
                author: "Lao Tzu"
            }
        });
    }
});

module.exports = router;

