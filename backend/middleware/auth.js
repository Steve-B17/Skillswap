const jwt = require('jsonwebtoken');
const User = require('../models/User');

const auth = async (req, res, next) => {
  try {
    // Get token from header
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      console.log('No token provided in request');
      return res.status(401).json({ 
        error: 'No token provided',
        details: 'Please log in to access this resource'
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('Decoded token:', {
      userId: decoded.userId,
      role: decoded.role
    });

    // Find user
    const user = await User.findById(decoded.userId);
    console.log('Found user:', {
      id: user?._id,
      role: user?.role,
      decodedRole: decoded.role
    });

    if (!user) {
      console.log('User not found for token');
      return res.status(401).json({ 
        error: 'User not found',
        details: 'The user associated with this token no longer exists'
      });
    }

    // Ensure user has a role
    if (!user.role) {
      console.log('User has no role set');
      return res.status(403).json({
        error: 'User role not set',
        details: 'Please contact support to set your role'
      });
    }

    // Set user in request
    req.token = token;
    req.user = user;
    next();
  } catch (error) {
    console.error('Auth middleware error:', {
      name: error.name,
      message: error.message,
      stack: error.stack
    });

    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        error: 'Invalid token',
        details: 'Please log in again'
      });
    }

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        error: 'Token expired',
        details: 'Please log in again'
      });
    }

    res.status(401).json({ 
      error: 'Authentication failed',
      details: error.message 
    });
  }
};

module.exports = auth; 