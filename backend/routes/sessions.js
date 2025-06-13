const express = require('express');
const router = express.Router();
const Session = require('../models/Session');
const User = require('../models/User');
const auth = require('../middleware/auth');

// Create new session
router.post('/', auth, async (req, res) => {
  try {
    const { skill, startTime, endTime, teacher, notes } = req.body;

    // Validate required fields with detailed error messages
    const validationErrors = [];
    if (!skill) validationErrors.push('Skill is required');
    if (!startTime) validationErrors.push('Start time is required');
    if (!endTime) validationErrors.push('End time is required');
    if (!teacher) validationErrors.push('Teacher is required');

    if (validationErrors.length > 0) {
      return res.status(400).json({ 
        error: 'Validation failed',
        details: validationErrors
      });
    }

    // Parse and validate dates
    const start = new Date(startTime);
    const end = new Date(endTime);
    const now = new Date();

    if (isNaN(start.getTime())) {
      return res.status(400).json({
        error: 'Invalid start time format',
        details: { received: startTime }
      });
    }

    if (isNaN(end.getTime())) {
      return res.status(400).json({
        error: 'Invalid end time format',
        details: { received: endTime }
      });
    }

    // Validate session timing
    if (start < now) {
      return res.status(400).json({
        error: 'Start time must be in the future'
      });
    }

    if (end <= start) {
      return res.status(400).json({
        error: 'End time must be after start time'
      });
    }

    // Check session duration (e.g., max 4 hours)
    const durationInHours = (end - start) / (1000 * 60 * 60);
    if (durationInHours > 4) {
      return res.status(400).json({
        error: 'Session duration cannot exceed 4 hours'
      });
    }

    // Prevent self-teaching
    if (teacher === req.user._id.toString()) {
      return res.status(400).json({ 
        error: 'You cannot book a session with yourself' 
      });
    }

    // Verify teacher exists and can teach this skill
    const teacherUser = await User.findById(teacher);
    if (!teacherUser) {
      return res.status(404).json({ 
        error: 'Teacher not found',
        details: { teacherId: teacher }
      });
    }

    if (!teacherUser.canTeach(skill)) {
      return res.status(400).json({ 
        error: 'Teacher is not qualified to teach this skill',
        details: {
          skill,
          teacherSkills: teacherUser.skills
        }
      });
    }

    // Check for overlapping sessions
    const overlappingSession = await Session.findOne({
      teacher,
      $or: [
        {
          startTime: { $lt: end },
          endTime: { $gt: start }
        }
      ],
      status: { $in: ['pending', 'confirmed'] }
    });

    if (overlappingSession) {
      return res.status(400).json({
        error: 'Teacher has an overlapping session',
        details: {
          existingSession: {
            startTime: overlappingSession.startTime,
            endTime: overlappingSession.endTime
          }
        }
      });
    }

    // Create the session
    const session = new Session({
      skill,
      startTime: start,
      endTime: end,
      student: req.user._id,
      teacher,
      notes: notes?.trim(),
      status: 'pending',
      createdAt: new Date()
    });

    await session.save();

    // Populate the teacher and student fields before sending response
    const populatedSession = await Session.findById(session._id)
      .populate('teacher', 'name email')
      .populate('student', 'name email');

    res.status(201).json({
      session: populatedSession,
      message: 'Session created successfully'
    });
  } catch (error) {
    console.error('Session creation error:', error);
    res.status(500).json({ 
      error: 'Session creation failed',
      details: error.message,
      code: error.code
    });
  }
});

// Get user's sessions
router.get('/my-sessions', auth, async (req, res) => {
  try {
    const sessions = await Session.find({
      $or: [
        { teacher: req.user._id },
        { student: req.user._id }
      ]
    })
    .populate('teacher', 'name email')
    .populate('student', 'name email')
    .sort({ startTime: -1 });
    
    res.json(sessions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update session status
router.patch('/:id/status', auth, async (req, res) => {
  try {
    const { status } = req.body;
    const allowedStatuses = ['pending', 'confirmed', 'completed', 'cancelled'];
    const statusTransitions = {
      pending: ['confirmed', 'cancelled'],
      confirmed: ['completed', 'cancelled'],
      completed: [],
      cancelled: []
    };

    // Validate status
    if (!status || !allowedStatuses.includes(status)) {
      return res.status(400).json({ 
        error: 'Invalid status',
        details: {
          allowedStatuses,
          received: status
        }
      });
    }

    const session = await Session.findOne({
      _id: req.params.id,
      $or: [
        { teacher: req.user._id },
        { student: req.user._id }
      ]
    });

    if (!session) {
      return res.status(404).json({ 
        error: 'Session not found',
        details: 'The session either does not exist or you do not have access to it'
      });
    }

    // Validate status transition
    if (!statusTransitions[session.status].includes(status)) {
      return res.status(400).json({
        error: 'Invalid status transition',
        details: {
          currentStatus: session.status,
          requestedStatus: status,
          allowedTransitions: statusTransitions[session.status]
        }
      });
    }

    // Check permissions
    if (status === 'confirmed' && session.teacher.toString() !== req.user._id.toString()) {
      return res.status(403).json({ 
        error: 'Only the teacher can confirm a session' 
      });
    }

    if (status === 'completed' && session.teacher.toString() !== req.user._id.toString()) {
      return res.status(403).json({ 
        error: 'Only the teacher can mark a session as completed' 
      });
    }

    // Additional validation for cancellation
    if (status === 'cancelled') {
      const now = new Date();
      const hoursUntilStart = (session.startTime - now) / (1000 * 60 * 60);
      
      // If less than 24 hours until session, only allow cancellation by teacher
      if (hoursUntilStart < 24 && session.teacher.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          error: 'Session can only be cancelled by teacher within 24 hours of start time'
        });
      }
    }

    // Update session status
    session.status = status;
    session.updatedAt = new Date();
    
    // Add status change to history
    session.statusHistory = session.statusHistory || [];
    session.statusHistory.push({
      status,
      changedBy: req.user._id,
      changedAt: new Date()
    });

    await session.save();

    const populatedSession = await Session.findById(session._id)
      .populate('teacher', 'name email')
      .populate('student', 'name email');

    res.json({
      session: populatedSession,
      message: `Session ${status} successfully`
    });
  } catch (error) {
    console.error('Session status update error:', error);
    res.status(500).json({ 
      error: 'Failed to update session status',
      details: error.message,
      code: error.code
    });
  }
});

// Update session notes (both teacher and student can update)
router.patch('/:id/notes', auth, async (req, res) => {
  const { notes } = req.body;

  try {
    const session = await Session.findOne({
      _id: req.params.id,
      $or: [
        { teacher: req.user._id },
        { student: req.user._id }
      ]
    });

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    session.notes = notes;
    await session.save();

    const populatedSession = await Session.findById(session._id)
      .populate('teacher', 'name email')
      .populate('student', 'name email');

    res.json(populatedSession);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Add review to session
router.post('/:id/review', auth, async (req, res) => {
  try {
    const { rating, comment } = req.body;
    const session = await Session.findById(req.params.id);

    if (!session) {
      return res.status(404).json({ 
        error: 'Session not found' 
      });
    }

    // Check if user is part of the session
    if (session.student.toString() !== req.user._id.toString() && 
        session.teacher.toString() !== req.user._id.toString()) {
      return res.status(403).json({ 
        error: 'Not authorized to review this session' 
      });
    }

    // Check if session is completed
    if (session.status !== 'completed') {
      return res.status(400).json({ 
        error: 'Can only review completed sessions' 
      });
    }

    // Add review based on user's role
    if (session.student.toString() === req.user._id.toString()) {
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

    // Update user ratings if both reviews are submitted
    if (session.studentReview && session.teacherReview) {
      const student = await User.findById(session.student);
      const teacher = await User.findById(session.teacher);
      
      await student.updateRating(session.teacherReview.rating);
      await teacher.updateRating(session.studentReview.rating);
    }

    const populatedSession = await Session.findById(session._id)
      .populate('teacher', 'name email')
      .populate('student', 'name email');

    res.json(populatedSession);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get teacher's sessions
router.get('/teacher-sessions', auth, async (req, res) => {
  try {
    // Log the request details
    console.log('Teacher sessions request received:', {
      userId: req.user._id,
      userRole: req.user.role
    });

    // Verify user is a teacher
    if (!req.user || req.user.role !== 'teacher') {
      console.log('Access denied: Invalid user or role');
      return res.status(403).json({ 
        error: 'Only teachers can access this endpoint',
        details: {
          userRole: req.user?.role,
          userId: req.user?._id
        }
      });
    }

    // Find sessions where the user is the teacher
    const sessions = await Session.find({ 
      teacher: req.user._id 
    }).populate({
      path: 'teacher',
      select: 'name email',
      model: 'User'
    }).populate({
      path: 'student',
      select: 'name email',
      model: 'User'
    }).sort({ startTime: -1 });

    console.log(`Found ${sessions.length} sessions for teacher ${req.user._id}`);
    
    // Return empty array if no sessions found
    res.json(sessions || []);
  } catch (error) {
    console.error('Error in teacher-sessions route:', {
      error: error.message,
      stack: error.stack,
      userId: req.user?._id,
      userRole: req.user?.role
    });

    res.status(500).json({ 
      error: 'Failed to fetch teacher sessions',
      details: error.message
    });
  }
});

// Get session details
router.get('/:id', auth, async (req, res) => {
  try {
    const session = await Session.findById(req.params.id)
      .populate('teacher', 'name email')
      .populate('student', 'name email');

    if (!session) {
      return res.status(404).json({ 
        error: 'Session not found' 
      });
    }

    // Check if user is authorized to view this session
    if (session.teacher._id.toString() !== req.user._id.toString() && 
        session.student._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ 
        error: 'Not authorized to view this session' 
      });
    }

    res.json(session);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update session meeting link
router.patch('/:id/meeting-link', auth, async (req, res) => {
  const { meetingLink } = req.body;

  try {
    const session = await Session.findOne({
      _id: req.params.id,
      $or: [
        { teacher: req.user._id },
        { student: req.user._id }
      ]
    });

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Only student can update meeting link
    if (session.student.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Only the student can update the meeting link' });
    }

    // Only allow updating meeting link when session is confirmed
    if (session.status !== 'confirmed') {
      return res.status(400).json({ error: 'Meeting link can only be updated for confirmed sessions' });
    }

    session.meetingLink = meetingLink;
    await session.save();

    const populatedSession = await Session.findById(session._id)
      .populate('teacher', 'name email')
      .populate('student', 'name email');

    res.json(populatedSession);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router; 