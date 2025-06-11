const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['student', 'teacher'],
    default: 'student'
  },
  bio: {
    type: String,
    trim: true
  },
  skills: [{
    name: String,
    level: {
      type: String,
      enum: ['Beginner', 'Intermediate', 'Advanced', 'Expert']
    }
  }],
  rating: {
    type: Number,
    default: 0
  },
  reviews: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Review'
  }],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Method to check if user can be a teacher
userSchema.methods.canBeTeacher = function() {
  return this.skills.some(skill => 
    skill.level === 'Advanced' || skill.level === 'Expert'
  );
};

// Method to check if user can teach a specific skill
userSchema.methods.canTeach = function(skillName) {
  return this.role === 'teacher' && this.skills.some(skill => 
    skill.name.toLowerCase() === skillName.toLowerCase() && 
    (skill.level === 'Advanced' || skill.level === 'Expert')
  );
};

// Method to update user's role based on skills
userSchema.methods.updateRole = function() {
  if (this.canBeTeacher()) {
    this.role = 'teacher';
  } else {
    this.role = 'student';
  }
};

// Method to update user's rating
userSchema.methods.updateRating = async function(newRating) {
  const totalReviews = this.reviews.length;
  this.rating = ((this.rating * totalReviews) + newRating) / (totalReviews + 1);
  await this.save();
};

module.exports = mongoose.model('User', userSchema); 