require('dotenv').config(); // Load environment variables
const axios = require('axios');

const verifyCaptcha = async (req, res, next) => {
  try {
    const captchaToken = req.body['g-recaptcha-response'];
    if (!captchaToken) {
      return res.status(400).json({ error: 'CAPTCHA verification required' });
    }

    // Get secret key from environment variables
    const secretKey = process.env.RECAPTCHA_SECRET_KEY;
    
    if (!secretKey) {
      console.error('RECAPTCHA_SECRET_KEY is not defined in environment variables');
      return res.status(500).json({ error: 'Server configuration error' });
    }

    const verificationURL = `https://www.google.com/recaptcha/api/siteverify?secret=${secretKey}&response=${captchaToken}`;

    const response = await axios.post(verificationURL);
    const data = response.data;

    if (!data.success) {
      return res.status(400).json({ 
        error: 'CAPTCHA verification failed',
        codes: data['error-codes']
      });
    }

    next();
  } catch (error) {
    console.error('CAPTCHA verification error:', error);
    res.status(500).json({ error: 'Internal server error during CAPTCHA verification' });
  }
};

module.exports = verifyCaptcha;