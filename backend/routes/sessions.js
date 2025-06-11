const express = require('express');
const router = express.Router();
const Session = require('../models/Session');
const User = require('../models/User');
const auth = require('../middleware/auth');

// Create new session
router.post('/', auth, async (req, res) => {
  try {
    const { skill, startTime, endTime, teacher, notes } = req.body;

    // Log the received data
    console.log('Received session data:', {
      skill,
      startTime,
      endTime,
      teacher,
      notes
    });

    // Validate required fields with detailed error messages
    const missingFields = [];
    if (!skill) missingFields.push('skill');
    if (!startTime) missingFields.push('startTime');
    if (!endTime) missingFields.push('endTime');
    if (!teacher) missingFields.push('teacher');

    if (missingFields.length > 0) {
      return res.status(400).json({ 
        error: `Missing required fields: ${missingFields.join(', ')}`,
        details: {
          received: {
            skill: !!skill,
            startTime: !!startTime,
            endTime: !!endTime,
            teacher: !!teacher
          }
        }
      });
    }

    // Validate date formats
    if (!(startTime instanceof Date) && isNaN(new Date(startTime).getTime())) {
      return res.status(400).json({
        error: 'Invalid startTime format',
        details: { received: startTime }
      });
    }

    if (!(endTime instanceof Date) && isNaN(new Date(endTime).getTime())) {
      return res.status(400).json({
        error: 'Invalid endTime format',
        details: { received: endTime }
      });
    }

    // Prevent self-teaching
    if (teacher === req.user._id.toString()) {
      return res.status(400).json({ 
        error: 'You cannot book a session with yourself' 
      });
    }

    // Verify teacher can teach this skill
    const teacherUser = await User.findById(teacher);
    if (!teacherUser) {
      return res.status(400).json({ 
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

    // Create the session
    const session = new Session({
      skill,
      startTime,
      endTime,
      student: req.user._id,
      teacher,
      notes,
      status: 'pending'
    });

    await session.save();

    // Populate the teacher and student fields before sending response
    const populatedSession = await Session.findById(session._id)
      .populate('teacher', 'name email')
      .populate('student', 'name email');

    res.status(201).json(populatedSession);
  } catch (error) {
    console.error('Session creation error:', error);
    res.status(400).json({ 
      error: error.message,
      details: error.stack
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
  const { status } = req.body;
  const allowedStatuses = ['confirmed', 'completed', 'cancelled'];

  if (!allowedStatuses.includes(status)) {
    return res.status(400).json({ 
      error: 'Invalid status' 
    });
  }

  try {
    const session = await Session.findOne({
      _id: req.params.id,
      $or: [
        { teacher: req.user._id },
        { student: req.user._id }
      ]
    });

    if (!session) {
      return res.status(404).json({ 
        error: 'Session not found' 
      });
    }

    // Only teacher can confirm or complete
    if (['confirmed', 'completed'].includes(status) && 
        session.teacher.toString() !== req.user._id.toString()) {
      return res.status(403).json({ 
        error: 'Only the teacher can confirm or complete a session' 
      });
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