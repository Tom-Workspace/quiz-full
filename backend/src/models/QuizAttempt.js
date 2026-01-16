const mongoose = require('mongoose');

const answerSchema = new mongoose.Schema({
  questionId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  answer: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  isCorrect: {
    type: Boolean,
    default: false
  },
  points: {
    type: Number,
    default: 0
  },
  timeSpent: {
    type: Number,
    default: 0
  },
  answeredAt: {
    type: Date,
    default: Date.now
  }
});

const quizAttemptSchema = new mongoose.Schema({
  quiz: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Quiz',
    required: true
  },
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  attemptNumber: {
    type: Number,
    required: true,
    min: 1
  },
  answers: [answerSchema],
  status: {
    type: String,
    enum: ['in-progress', 'completed', 'abandoned', 'time-expired'],
    default: 'in-progress'
  },
  score: {
    type: Number,
    default: 0
  },
  totalPoints: {
    type: Number,
    required: true
  },
  percentage: {
    type: Number,
    default: 0
  },
  // ✅ NEW: هل الطالب نجح في الكويز (بناءً على passingScore)
  isPassed: {
    type: Boolean,
    default: false
  },
  startedAt: {
    type: Date,
    default: Date.now
  },
  completedAt: {
    type: Date
  },
  timeSpent: {
    type: Number,
    default: 0
  },
  currentQuestionIndex: {
    type: Number,
    default: 0
  },
  ipAddress: {
    type: String
  },
  userAgent: {
    type: String
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  cheatLogs: [{
    message: { type: String },
    timestamp: { type: Date, default: Date.now }
  }]
});

quizAttemptSchema.index({ quiz: 1, student: 1, attemptNumber: 1 }, { unique: true });
quizAttemptSchema.index({ student: 1 });
quizAttemptSchema.index({ quiz: 1 });
quizAttemptSchema.index({ status: 1 });
quizAttemptSchema.index({ createdAt: -1 });

quizAttemptSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  
  if (this.totalPoints > 0) {
    this.percentage = Math.round((this.score / this.totalPoints) * 100);
  }
  
  next();
});

quizAttemptSchema.pre('save', function(next) {
  if (this.status === 'completed' && !this.completedAt) {
    this.completedAt = new Date();
    this.timeSpent = Math.floor((this.completedAt - this.startedAt) / 1000);
  }
  next();
});

quizAttemptSchema.statics.getBestAttempt = function(quizId, studentId) {
  return this.findOne({
    quiz: quizId,
    student: studentId,
    status: 'completed'
  }).sort({ score: -1, completedAt: 1 });
};

quizAttemptSchema.statics.getAttemptCount = function(quizId, studentId) {
  return this.countDocuments({
    quiz: quizId,
    student: studentId
  });
};

module.exports = mongoose.model('QuizAttempt', quizAttemptSchema);