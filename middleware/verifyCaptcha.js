const verifyCaptcha = async (req, res, next) => {
    try {
      const captchaToken = req.body['g-recaptcha-response'];
      
      if (!captchaToken) {
        return res.status(400).json({ 
          status: "FAILED",
          message: 'CAPTCHA verification required' 
        });
      }
  
      const secretKey = process.env.RECAPTCHA_SECRET_KEY;
      
      if (!secretKey) {
        return res.status(500).json({ 
          status: "FAILED",
          message: 'Server configuration error' 
        });
      }
  
      const verificationURL = `https://www.google.com/recaptcha/api/siteverify?secret=${secretKey}&response=${captchaToken}`;
      
      const response = await axios.post(verificationURL);
      const data = response.data;
  
      if (!data.success) {
        return res.status(400).json({ 
          status: "FAILED",
          message: 'CAPTCHA verification failed',
          codes: data['error-codes']
        });
      }
  
      next();
    } catch (error) {
      console.error('CAPTCHA verification error:', error);
      return res.status(500).json({ 
        status: "FAILED",
        message: 'Internal server error during CAPTCHA verification' 
      });
    }
  };