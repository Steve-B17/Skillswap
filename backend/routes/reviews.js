const express = require('express');
const router = express.Router();
const Review = require('../models/Review');
const User = require('../models/User');
const Session = require('../models/Session');
const auth = require('../middleware/auth');

// Create a new review
router.post('/', auth, async (req, res) => {
  try {
    const { session: sessionId, reviewee, rating, comment } = req.body;

    // Validate required fields
    if (!sessionId || !reviewee || !rating || !comment) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // Validate rating
    if (rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    }

    // Verify the session exists and is completed
    const session = await Session.findById(sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }
    if (session.status !== 'completed') {
      return res.status(400).json({ error: 'Can only review completed sessions' });
    }

    // Verify the reviewer is either the teacher or student
    if (session.teacher.toString() !== req.user._id.toString() && 
        session.student.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Not authorized to review this session' });
    }

    // Verify the reviewee is either the teacher or student
    if (session.teacher.toString() !== reviewee && 
        session.student.toString() !== reviewee) {
      return res.status(400).json({ error: 'Invalid reviewee' });
    }

    // Check if user has already reviewed this session
    const existingReview = await Review.findOne({
      session: sessionId,
      reviewer: req.user._id
    });

    if (existingReview) {
      return res.status(400).json({ error: 'You have already reviewed this session' });
    }

    // Create the review
    const review = new Review({
      session: sessionId,
      reviewer: req.user._id,
      reviewee,
      rating,
      comment
    });

    await review.save();

    // Update user's average rating
    const user = await User.findById(reviewee);
    const userReviews = await Review.find({ reviewee });
    const averageRating = userReviews.reduce((acc, curr) => acc + curr.rating, 0) / userReviews.length;
    user.rating = averageRating;
    user.reviews.push(review._id);
    await user.save();

    // Populate reviewer and reviewee details
    await review.populate('reviewer', 'name');
    await review.populate('reviewee', 'name');

    res.status(201).json(review);
  } catch (error) {
    console.error('Review creation error:', error);
    res.status(400).json({ error: error.message });
  }
});

// Get reviews for a user
router.get('/user/:userId', auth, async (req, res) => {
  try {
    const reviews = await Review.find({ reviewee: req.params.userId })
      .populate('reviewer', 'name')
      .populate('reviewee', 'name')
      .sort({ createdAt: -1 });
    res.json(reviews);
  } catch (error) {
    res.status(500).json({ error: error.message });
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