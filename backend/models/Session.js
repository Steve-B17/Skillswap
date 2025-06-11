const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema({
  skill: {
    type: String,
    required: true,
    trim: true
  },
  startTime: {
    type: Date,
    required: true,
    index: true
  },
  endTime: {
    type: Date,
    required: true
  },
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  teacher: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'completed', 'cancelled'],
    default: 'pending'
  },
  meetingLink: {
    type: String,
    trim: true
  },
  notes: {
    type: String,
    trim: true
  },
  studentReview: {
    rating: {
      type: Number,
      min: 1,
      max: 5
    },
    comment: {
      type: String,
      trim: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  },
  teacherReview: {
    rating: {
      type: Number,
      min: 1,
      max: 5
    },
    comment: {
      type: String,
      trim: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Create compound index for teacher and startTime
sessionSchema.index({ teacher: 1, startTime: -1 });

// Validate that endTime is after startTime
sessionSchema.pre('save', function(next) {
  if (this.endTime <= this.startTime) {
    next(new Error('End time must be after start time'));
  }
  next();
});

// Validate that student and teacher are different users
sessionSchema.pre('save', function(next) {
  if (this.student.toString() === this.teacher.toString()) {
    next(new Error('Student and teacher cannot be the same user'));
  }
  next();
});

// Method to check if session is in the future
sessionSchema.methods.isInFuture = function() {
  return this.startTime > new Date();
};

// Method to check if session is completed
sessionSchema.methods.isCompleted = function() {
  return this.status === 'completed';
};

// Method to check if session can be reviewed
sessionSchema.methods.canBeReviewed = function() {
  return this.isCompleted() && !this.studentReview && !this.teacherReview;
};

module.exports = mongoose.model('Session', sessionSchema); 