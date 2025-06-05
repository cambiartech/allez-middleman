const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');

/**
 * Validates authentication for backend API calls (Laravel to Middleman)
 */
const validateBackendAuth = (req, res, next) => {
  try {
    const apiKey = req.headers['x-api-key'];
    const expectedApiKey = process.env.LARAVEL_API_KEY;

    if (!apiKey) {
      return res.status(401).json({ error: 'API key required' });
    }

    if (!expectedApiKey) {
      logger.error('LARAVEL_API_KEY not configured');
      return res.status(500).json({ error: 'Server configuration error' });
    }

    if (apiKey !== expectedApiKey) {
      logger.warn('Invalid API key attempt', { ip: req.ip });
      return res.status(401).json({ error: 'Invalid API key' });
    }

    next();
  } catch (error) {
    logger.error('Backend auth error:', error);
    res.status(500).json({ error: 'Authentication error' });
  }
};

/**
 * Validates JWT token for WebSocket connections (Frontend clients)
 */
const validateSocketAuth = (socket, next) => {
  try {
    const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return next(new Error('Authentication token required'));
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      logger.error('JWT_SECRET not configured');
      return next(new Error('Server configuration error'));
    }

    jwt.verify(token, jwtSecret, (err, decoded) => {
      if (err) {
        logger.warn('Invalid JWT token', { error: err.message });
        return next(new Error('Invalid token'));
      }

      // Attach user info to socket
      socket.userId = decoded.user_id || decoded.id;
      socket.userType = decoded.user_type || 'rider'; // 'rider' or 'driver'
      socket.userEmail = decoded.email;

      logger.info('Socket authenticated', { 
        userId: socket.userId, 
        userType: socket.userType,
        socketId: socket.id 
      });

      next();
    });
  } catch (error) {
    logger.error('Socket auth error:', error);
    next(new Error('Authentication error'));
  }
};

/**
 * Generates a JWT token (utility function for testing)
 */
const generateToken = (payload) => {
  const jwtSecret = process.env.JWT_SECRET;
  const expiresIn = process.env.JWT_EXPIRES_IN || '24h';
  
  return jwt.sign(payload, jwtSecret, { expiresIn });
};

/**
 * Middleware to validate JWT for regular HTTP routes (if needed)
 */
const validateJWT = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({ error: 'Access token required' });
    }

    const jwtSecret = process.env.JWT_SECRET;
    jwt.verify(token, jwtSecret, (err, decoded) => {
      if (err) {
        return res.status(403).json({ error: 'Invalid or expired token' });
      }

      req.user = decoded;
      next();
    });
  } catch (error) {
    logger.error('JWT validation error:', error);
    res.status(500).json({ error: 'Authentication error' });
  }
};

module.exports = {
  validateBackendAuth,
  validateSocketAuth,
  validateJWT,
  generateToken
}; 