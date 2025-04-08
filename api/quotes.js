// api/quotes.js
const express = require('express');
const axios = require('axios');

// Create a router for the quotes API
const router = express.Router();

// Route to fetch a random motivational quote
router.get('/', async (req, res) => {
    try {
        // Make a request to ZenQuotes API to get a random quote
        const response = await axios.get('https://zenquotes.io/api/random');
        const quote = response.data[0].q;  // Quote text
        const author = response.data[0].a; // Author name

        // Send the quote and author as a response
        res.json({
            quote: quote,
            author: author
        });
    } catch (error) {
        console.error('Error fetching quote:', error);
        res.status(500).json({ error: 'Failed to fetch quote' });
    }
});

module.exports = router;

