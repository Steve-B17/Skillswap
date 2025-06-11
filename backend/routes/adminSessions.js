const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Session = require('../models/Session');

// Get all sessions with filtering
router.get('/sessions', auth, async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    const query = {};

    if (status) {
      query.status = status;
    }

    const sessions = await Session.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .populate('mentor', 'name email')
      .populate('mentee', 'name email');

    const total = await Session.countDocuments(query);

    res.json({
      sessions,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error('Error fetching sessions:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update session status
router.patch('/sessions/:id/status', auth, async (req, res) => {
  try {
    const { status } = req.body;
    const { id } = req.params;

    const validStatuses = ['ongoing', 'completed', 'rejected'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const session = await Session.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    ).populate('mentor', 'name email').populate('mentee', 'name email');

    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }

    res.json(session);
  } catch (error) {
    console.error('Error updating session:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get session statistics
router.get('/statistics', auth, async (req, res) => {
  try {
    const totalSessions = await Session.countDocuments();
    const ongoingSessions = await Session.countDocuments({ status: 'ongoing' });
    const completedSessions = await Session.countDocuments({ status: 'completed' });
    const rejectedSessions = await Session.countDocuments({ status: 'rejected' });

    res.json({
      totalSessions,
      ongoingSessions,
      completedSessions,
      rejectedSessions
    });
  } catch (error) {
    console.error('Error fetching statistics:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get session details
router.get('/sessions/:id', auth, async (req, res) => {
  try {
    const session = await Session.findById(req.params.id)
      .populate('mentor', 'name email')
      .populate('mentee', 'name email');

    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }

    res.json(session);
  } catch (error) {
    console.error('Error fetching session details:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router; 