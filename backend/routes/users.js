const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const auth = require('../middleware/auth');

// Register new user
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    
    // Enhanced validation with detailed error messages
    const validationErrors = [];
    if (!name || name.trim().length < 2) {
      validationErrors.push('Name must be at least 2 characters long');
    }
    if (!email) {
      validationErrors.push('Email is required');
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        validationErrors.push('Invalid email format');
      }
    }
    if (!password) {
      validationErrors.push('Password is required');
    } else if (password.length < 8) {
      validationErrors.push('Password must be at least 8 characters long');
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
      validationErrors.push('Password must contain at least one uppercase letter, one lowercase letter, and one number');
    }

    if (validationErrors.length > 0) {
      return res.status(400).json({ 
        error: 'Validation failed',
        details: validationErrors
      });
    }

    // Check for existing user with case-insensitive email
    const existingUser = await User.findOne({ 
      email: { $regex: new RegExp(`^${email}$`, 'i') }
    });
    
    if (existingUser) {
      return res.status(400).json({ 
        error: 'Email already registered',
        details: 'Please use a different email address or try logging in'
      });
    }

    // Validate role
    if (role && !['student', 'teacher'].includes(role)) {
      return res.status(400).json({ 
        error: 'Invalid role',
        details: 'Role must be either "student" or "teacher"'
      });
    }

    const user = new User({ 
      name: name.trim(), 
      email: email.toLowerCase().trim(), 
      password,
      role: role || 'student'
    });
    await user.save();

    const token = jwt.sign(
      { 
        userId: user._id,
        role: user.role,
        email: user.email
      }, 
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    const userResponse = user.toObject();
    delete userResponse.password;

    res.status(201).json({ 
      user: userResponse, 
      token,
      message: 'Registration successful'
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ 
      error: 'Registration failed',
      details: error.message,
      code: error.code
    });
  }
});

// Login user
router.post('/login', async (req, res) => {
  try {
    const { email, password, role } = req.body;
    console.log('Login attempt:', { email, role });

    const user = await User.findOne({ email });
    console.log('Found user:', {
      id: user?._id,
      role: user?.role,
      requestedRole: role
    });

    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ error: 'Invalid login credentials' });
    }

    // Verify role if provided
    if (role && user.role !== role) {
      console.log('Role mismatch:', {
        userRole: user.role,
        requestedRole: role
      });
      return res.status(403).json({ 
        error: `Invalid role. This account is registered as a ${user.role}` 
      });
    }

    // Create token with user role
    const token = jwt.sign(
      { 
        userId: user._id,
        role: user.role 
      }, 
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    console.log('Generated token with role:', user.role);

    // Don't send password in response
    const userResponse = user.toObject();
    delete userResponse.password;

    res.json({ 
      user: userResponse, 
      token,
      role: user.role // Explicitly include role in response
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(400).json({ error: error.message });
  }
});

// Get user profile
router.get('/profile', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .select('-password')
      .populate('skills');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Add role-specific data
    const response = user.toObject();
    if (user.role === 'teacher') {
      response.canTeach = user.skills.filter(skill => 
        skill.level === 'Advanced' || skill.level === 'Expert'
      ).map(skill => skill.name);
    }

    res.json(response);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update user profile
router.patch('/profile', auth, async (req, res) => {
  try {
    const updates = Object.keys(req.body);
    const allowedUpdates = ['name', 'email', 'password', 'bio', 'skills'];
    const isValidOperation = updates.every(update => allowedUpdates.includes(update));

    if (!isValidOperation) {
      return res.status(400).json({ 
        error: 'Invalid updates',
        allowedUpdates 
      });
    }

    // Validate email if it's being updated
    if (updates.includes('email')) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(req.body.email)) {
        return res.status(400).json({ error: 'Invalid email format' });
      }
      
      // Check if email is already taken
      const existingUser = await User.findOne({ email: req.body.email });
      if (existingUser && existingUser._id.toString() !== req.user._id.toString()) {
        return res.status(400).json({ error: 'Email already in use' });
      }
    }

    // Validate password if it's being updated
    if (updates.includes('password') && req.body.password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }

    updates.forEach(update => req.user[update] = req.body[update]);
    await req.user.save();

    const userResponse = req.user.toObject();
    delete userResponse.password;

    res.json(userResponse);
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ 
      error: 'Profile update failed',
      details: error.message 
    });
  }
});

// Update user skills
router.patch('/skills', auth, async (req, res) => {
  try {
    const { skills } = req.body;
    
    // Validate skills
    if (!Array.isArray(skills)) {
      return res.status(400).json({ error: 'Skills must be an array' });
    }

    // Validate each skill
    for (const skill of skills) {
      if (!skill.name || !skill.level) {
        return res.status(400).json({ error: 'Each skill must have a name and level' });
      }
      if (!['Beginner', 'Intermediate', 'Advanced', 'Expert'].includes(skill.level)) {
        return res.status(400).json({ error: 'Invalid skill level' });
      }
    }

    // Update user's skills
    req.user.skills = skills;
    
    // Update role based on skills
    req.user.updateRole();
    
    await req.user.save();

    // Don't send password in response
    const userResponse = req.user.toObject();
    delete userResponse.password;

    res.json(userResponse);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Search users by skill (only returns teachers)
router.get('/search', auth, async (req, res) => {
  try {
    const { skill } = req.query;
    let query = { role: 'teacher' };

    if (skill) {
      query = {
        ...query,
        'skills.name': { $regex: skill, $options: 'i' },
        'skills.level': { $in: ['Advanced', 'Expert'] }
      };
    }

    const users = await User.find(query)
      .select('-password')
      .populate('skills');

    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router; 