const express = require('express');
const router = express.Router();
const Review = require('../models/Review');
const User = require('../models/User');
const Session = require('../models/Session');
const auth = require('../middleware/auth');

// Add review to session
router.post('/:sessionId', auth, async (req, res) => {
  try {
    const { rating, comment } = req.body;
    const sessionId = req.params.sessionId;

    // Validate input
    if (!rating || typeof rating !== 'number' || rating < 1 || rating > 5) {
      return res.status(400).json({
        error: 'Invalid rating',
        details: 'Rating must be a number between 1 and 5'
      });
    }

    if (!comment || typeof comment !== 'string' || comment.trim().length === 0) {
      return res.status(400).json({
        error: 'Invalid comment',
        details: 'Comment is required and cannot be empty'
      });
    }

    const session = await Session.findById(sessionId);
    if (!session) {
      return res.status(404).json({ 
        error: 'Session not found',
        details: { sessionId }
      });
    }

    // Check if user is part of the session
    if (session.student.toString() !== req.user._id.toString() && 
        session.teacher.toString() !== req.user._id.toString()) {
      return res.status(403).json({ 
        error: 'Not authorized to review this session',
        details: { 
          sessionId,
          userId: req.user._id
        }
      });
    }

    // Check if session is completed
    if (session.status !== 'completed') {
      return res.status(400).json({ 
        error: 'Can only review completed sessions',
        details: { 
          currentStatus: session.status,
          requiredStatus: 'completed'
        }
      });
    }

    // Check if user has already reviewed
    const isStudent = session.student.toString() === req.user._id.toString();
    const existingReview = isStudent ? session.studentReview : session.teacherReview;
    
    if (existingReview) {
      return res.status(400).json({
        error: 'You have already reviewed this session',
        details: { existingReview }
      });
    }

    // Add review based on user's role
    if (isStudent) {
      session.studentReview = { 
        rating, 
        comment, 
        createdAt: new Date() 
      };
    } else {
      session.teacherReview = { 
        rating, 
        comment, 
        createdAt: new Date() 
      };
    }

    await session.save();

    // Update teacher's average rating if student reviewed
    if (isStudent) {
      const teacher = await User.findById(session.teacher);
      if (teacher) {
        const teacherSessions = await Session.find({
          teacher: teacher._id,
          'studentReview.rating': { $exists: true }
        });

        const totalRating = teacherSessions.reduce((sum, s) => sum + s.studentReview.rating, 0);
        teacher.averageRating = totalRating / teacherSessions.length;
        await teacher.save();
      }
    }

    const populatedSession = await Session.findById(session._id)
      .populate('teacher', 'name email')
      .populate('student', 'name email');

    res.json(populatedSession);
  } catch (error) {
    console.error('Review creation error:', error);
    res.status(500).json({ 
      error: 'Failed to create review',
      details: error.message 
    });
  }
});

// Get reviews for a user
router.get('/user/:userId', auth, async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    const sessions = await Session.find({
      teacher: req.params.userId,
      'studentReview.rating': { $exists: true }
    })
    .populate('student', 'name email')
    .sort({ 'studentReview.createdAt': -1 })
    .skip(skip)
    .limit(parseInt(limit));

    const total = await Session.countDocuments({
      teacher: req.params.userId,
      'studentReview.rating': { $exists: true }
    });

    const reviews = sessions.map(session => ({
      rating: session.studentReview.rating,
      comment: session.studentReview.comment,
      createdAt: session.studentReview.createdAt,
      student: session.student,
      skill: session.skill
    }));

    res.json({
      reviews,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching reviews:', error);
    res.status(500).json({ 
      error: 'Failed to fetch reviews',
      details: error.message 
    });
  }
});

// Get reviews for a session
router.get('/session/:sessionId', auth, async (req, res) => {
  try {
    const reviews = await Review.find({ session: req.params.sessionId })
      .populate('reviewer', 'name')
      .populate('reviewee', 'name');
    res.json(reviews);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router; 