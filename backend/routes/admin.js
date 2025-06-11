const express = require('express');
const router = express.Router();
const Session = require('../models/Session');
const User = require('../models/User');
const adminAuth = require('../middleware/adminAuth');

// Get all sessions (admin only)
router.get('/sessions', adminAuth, async (req, res) => {
  try {
    const sessions = await Session.find()
      .populate('teacher', 'name email')
      .populate('student', 'name email')
      .sort({ startTime: -1 });
    
    res.json(sessions);
  } catch (error) {
    console.error('Error fetching sessions:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get all users (admin only)
router.get('/users', adminAuth, async (req, res) => {
  try {
    const users = await User.find()
      .select('-password')
      .sort({ createdAt: -1 });
    
    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update session status
router.patch('/sessions/:id', adminAuth, async (req, res) => {
  try {
    const session = await Session.findById(req.params.id);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const { status } = req.body;
    if (!['pending', 'confirmed', 'completed', 'cancelled'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    session.status = status;
    await session.save();

    const populatedSession = await Session.findById(session._id)
      .populate('teacher', 'name email')
      .populate('student', 'name email');

    res.json(populatedSession);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Delete a session
router.delete('/sessions/:id', adminAuth, async (req, res) => {
  try {
    const session = await Session.findByIdAndDelete(req.params.id);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }
    res.json({ message: 'Session deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update user role
router.patch('/users/:id/role', adminAuth, async (req, res) => {
  try {
    const { role } = req.body;
    if (!['user', 'admin'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    user.role = role;
    await user.save();

    const updatedUser = await User.findById(user._id).select('-password');
    res.json(updatedUser);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get platform statistics
router.get('/statistics', adminAuth, async (req, res) => {
  try {
    // Get total users and teachers
    const totalUsers = await User.countDocuments();
    const totalTeachers = await User.countDocuments({ role: 'teacher' });
    const totalStudents = await User.countDocuments({ role: 'student' });

    // Get session statistics
    const totalSessions = await Session.countDocuments();
    const pendingSessions = await Session.countDocuments({ status: 'pending' });
    const confirmedSessions = await Session.countDocuments({ status: 'confirmed' });
    const completedSessions = await Session.countDocuments({ status: 'completed' });
    const cancelledSessions = await Session.countDocuments({ status: 'cancelled' });

    // Get average teacher rating
    const teachers = await User.find({ role: 'teacher' });
    const averageTeacherRating = teachers.reduce((acc, teacher) => acc + (teacher.rating || 0), 0) / (teachers.length || 1);

    // Get recent activity (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recentSessions = await Session.countDocuments({
      createdAt: { $gte: sevenDaysAgo }
    });

    res.json({
      users: {
        total: totalUsers,
        teachers: totalTeachers,
        students: totalStudents
      },
      sessions: {
        total: totalSessions,
        pending: pendingSessions,
        confirmed: confirmedSessions,
        completed: completedSessions,
        cancelled: cancelledSessions
      },
      ratings: {
        averageTeacherRating: parseFloat(averageTeacherRating.toFixed(2))
      },
      recentActivity: {
        newSessionsLast7Days: recentSessions
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router; 