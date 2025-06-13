const jwt = require('jsonwebtoken');
const User = require('../models/User');

const auth = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.header('Authorization');
    
    if (!authHeader) {
      console.log('No Authorization header provided');
      return res.status(401).json({ 
        error: 'Authentication required',
        details: 'Please provide an Authorization header'
      });
    }

    const token = authHeader.replace('Bearer ', '');
    
    if (!token) {
      console.log('No token provided in request');
      return res.status(401).json({ 
        error: 'No token provided',
        details: 'Please log in to access this resource'
      });
    }

    // Verify token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({ 
          error: 'Token expired',
          details: 'Please log in again'
        });
      }
      if (error.name === 'JsonWebTokenError') {
        return res.status(401).json({ 
          error: 'Invalid token',
          details: 'Please log in again'
        });
      }
      throw error;
    }

    // Validate decoded token
    if (!decoded.userId) {
      console.log('Invalid token structure:', decoded);
      return res.status(401).json({ 
        error: 'Invalid token structure',
        details: 'Token is malformed'
      });
    }

    // Find user
    const user = await User.findById(decoded.userId).select('-password');
    
    if (!user) {
      console.log('User not found for token:', decoded.userId);
      return res.status(401).json({ 
        error: 'User not found',
        details: 'The user associated with this token no longer exists'
      });
    }

    // Check if user is active
    if (user.status === 'inactive') {
      console.log('Inactive user attempted access:', user._id);
      return res.status(403).json({
        error: 'Account inactive',
        details: 'Your account has been deactivated. Please contact support.'
      });
    }

    // Ensure user has a role
    if (!user.role) {
      console.log('User has no role set:', user._id);
      return res.status(403).json({
        error: 'User role not set',
        details: 'Please contact support to set your role'
      });
    }

    // Validate role if specified in token
    if (decoded.role && decoded.role !== user.role) {
      console.log('Role mismatch:', {
        tokenRole: decoded.role,
        userRole: user.role
      });
      return res.status(403).json({
        error: 'Role mismatch',
        details: 'Your role has changed. Please log in again.'
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

    res.status(500).json({ 
      error: 'Authentication failed',
      details: 'An unexpected error occurred during authentication'
    });
  }
};

module.exports = auth; 