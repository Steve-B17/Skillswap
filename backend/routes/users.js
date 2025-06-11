const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const auth = require('../middleware/auth');

// Register new user
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Validate role
    if (role && !['student', 'teacher'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    const user = new User({ 
      name, 
      email, 
      password,
      role: role || 'student' // Default to student if no role provided
    });
    await user.save();

    const token = jwt.sign(
      { 
        userId: user._id,
        role: user.role 
      }, 
      process.env.JWT_SECRET
    );

    // Don't send password in response
    const userResponse = user.toObject();
    delete userResponse.password;

    res.status(201).json({ user: userResponse, token });
  } catch (error) {
    res.status(400).json({ error: error.message });
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
  const updates = Object.keys(req.body);
  const allowedUpdates = ['name', 'email', 'password', 'bio', 'skills'];
  const isValidOperation = updates.every(update => allowedUpdates.includes(update));

  if (!isValidOperation) {
    return res.status(400).json({ error: 'Invalid updates' });
  }

  try {
    updates.forEach(update => req.user[update] = req.body[update]);
    await req.user.save();
    res.json(req.user);
  } catch (error) {
    res.status(400).json({ error: error.message });
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