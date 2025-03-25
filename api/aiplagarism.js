
require('dotenv').config(); // Ensure .env is loaded
const express = require('express');
const axios = require('axios');
const router = express.Router();

// Load Copyleaks credentials from environment variables
const COPYLEAKS_EMAIL = 'bareajoudi@gmail.com';
const COPYLEAKS_API_KEY ='679ab60c-bf1d-4f52-b799-f282d1aa5920';

// Debugging: Ensure credentials are loaded
console.log("Loaded Copyleaks credentials:", { 
    COPYLEAKS_EMAIL, 
    COPYLEAKS_API_KEY: COPYLEAKS_API_KEY ? "LOADED" : "MISSING"
});

// Function to get Copyleaks access token
async function getCopyleaksAccessToken() {
    if (!COPYLEAKS_EMAIL || !COPYLEAKS_API_KEY) {
        console.error("ERROR: Copyleaks email or API key is missing.");
        throw new Error("Missing Copyleaks credentials. Check environment variables.");
    }

    try {
        console.log("Requesting Copyleaks Access Token...");

        const response = await axios.post('https://id.copyleaks.com/v3/account/login/api', {
            email: COPYLEAKS_EMAIL,
            apiKey: COPYLEAKS_API_KEY
        });

        console.log("✅ Successfully obtained Copyleaks token.");
        return response.data.access_token;
    } catch (err) {
        console.error("❌ Error obtaining Copyleaks token:", err.response?.data || err.message);
        throw new Error("Failed to authenticate with Copyleaks. Check your API key.");
    }
}

/**
 * POST /detect
 * Analyzes a given text to determine if it is AI-generated using Copyleaks.
 */
router.post('/detect', async (req, res) => {
    const { text } = req.body;
    if (!text) {
        return res.status(400).json({ error: 'Text is required' });
    }

    try {
        console.log("🔍 Detecting AI-generated content...");

        // Get an access token from Copyleaks
        const token = await getCopyleaksAccessToken();

        // Submit text for AI detection
        const scanResponse = await axios.post(
            'https://api.copyleaks.com/v3/ai/detection',
            { text },
            {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        console.log("✅ Detection completed successfully.");
        return res.json(scanResponse.data);
    } catch (error) {
        console.error("❌ Error detecting AI-generated content:", error.response?.data || error.message);
        return res.status(500).json({ error: 'Failed to analyze text' });
    }
});

module.exports = router;
