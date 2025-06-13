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
    validate: {
      validator: function(v) {
        return v > new Date();
      },
      message: 'Start time must be in the future'
    }
  },
  endTime: {
    type: Date,
    required: true,
    validate: {
      validator: function(v) {
        return v > this.startTime;
      },
      message: 'End time must be after start time'
    }
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
  statusHistory: [{
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'completed', 'cancelled']
    },
    changedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    changedAt: {
      type: Date,
      default: Date.now
    }
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Create compound index for teacher and startTime
sessionSchema.index({ teacher: 1, startTime: -1 });

// Validate session duration
sessionSchema.pre('save', function(next) {
  const durationInHours = (this.endTime - this.startTime) / (1000 * 60 * 60);
  if (durationInHours > 4) {
    next(new Error('Session duration cannot exceed 4 hours'));
  }
  next();
});

// Prevent self-teaching
sessionSchema.pre('save', function(next) {
  if (this.student.toString() === this.teacher.toString()) {
    next(new Error('Teacher cannot be the same as student'));
  }
  next();
});

// Method to check if session can be cancelled
sessionSchema.methods.canBeCancelled = function(userId) {
  const now = new Date();
  const hoursUntilStart = (this.startTime - now) / (1000 * 60 * 60);
  
  if (this.status === 'completed' || this.status === 'cancelled') {
    return false;
  }

  if (hoursUntilStart < 24) {
    return this.teacher.toString() === userId.toString();
  }

  return true;
};

// Method to check if session can be reviewed
sessionSchema.methods.canBeReviewed = function(userId) {
  if (this.status !== 'completed') {
    return false;
  }

  const hasStudentReview = this.studentReview && this.studentReview.rating;
  const hasTeacherReview = this.teacherReview && this.teacherReview.rating;

  if (this.student.toString() === userId.toString()) {
    return !hasStudentReview;
  }

  if (this.teacher.toString() === userId.toString()) {
    return !hasTeacherReview;
  }

  return false;
};

module.exports = mongoose.model('Session', sessionSchema); 