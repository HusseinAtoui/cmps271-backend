// middleware/authorize.js
const authorizeRoles = (...allowedRoles) => {
    return (req, res, next) => {
      // req.user is set by your verifyToken middleware from authenticateUser.js :contentReference[oaicite:0]{index=0}
      if (req.user && allowedRoles.includes(req.user.role)) {
        console.log("Decoded user:", req.user);

        return next();

      }
      return res.status(403).json({ error: 'Forbidden: Insufficient permissions' });
    };
  };
  
  module.exports = { authorizeRoles };
  