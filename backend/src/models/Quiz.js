const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['text', 'image', 'audio'],
    required: true
  },
  content: {
    type: String,
    required: true
  },
  mediaUrl: {
    type: String,
    required: function() {
      return this.type === 'image' || this.type === 'audio';
    }
  },
  answerType: {
    type: String,
    enum: ['single-choice', 'multiple-choice', 'image-selection', 'text-answer', 'true-false'],
    required: true
  },
  options: [{
    text: String,
    imageUrl: String,
    isCorrect: {
      type: Boolean,
      default: false
    }
  }],
  correctAnswer: {
    type: String,
    required: function() {
      return this.answerType === 'text-answer';
    }
  },
  correctBoolean: {
    type: Boolean,
    required: function() {
      return this.answerType === 'true-false';
    }
  },
  points: {
    type: Number,
    default: 1,
    min: 0
  },
  timeLimit: {
    type: Number, // in seconds
    default: 60
  }
});

const quizSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Quiz title is required'],
    trim: true,
    maxlength: [100, 'Title cannot exceed 100 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // ✅ NEW: ربط الكويز بكورس معين (optional للكويزات القديمة)
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    default: null
  },
  // ✅ NEW: ربط الكويز بفصل معين (optional للكويزات القديمة)
  chapter: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Chapter',
    default: null
  },
  questions: [questionSchema],
  settings: {
    startDate: {
      type: Date,
      required: true
    },
    endDate: {
      type: Date,
      required: true
    },
    duration: {
      type: Number, // in minutes
      required: true,
      min: 1
    },
    maxAttempts: {
      type: Number,
      default: 1,
      min: 1
    },
    // ✅ NEW: النسبة المطلوبة للنجاح في الكويز
    passingScore: {
      type: Number,
      default: 60,
      min: 0,
      max: 100
    },
    showAnswers: {
      type: String,
      enum: ['immediately', 'after-quiz-ends', 'never'],
      default: 'after-quiz-ends'
    },
    showScore: {
      type: String,
      enum: ['immediately', 'after-quiz-ends', 'never'],
      default: 'immediately'
    },
    allowResume: {
      type: Boolean,
      default: true
    },
    shuffleQuestions: {
      type: Boolean,
      default: false
    },
    shuffleOptions: {
      type: Boolean,
      default: false
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Index for better query performance
quizSchema.index({ createdBy: 1 });
quizSchema.index({ 'settings.startDate': 1, 'settings.endDate': 1 });
quizSchema.index({ isActive: 1 });
quizSchema.index({ createdAt: -1 });
// ✅ NEW: Indexes للربط بالكورسات والفصول
quizSchema.index({ course: 1 });
quizSchema.index({ chapter: 1 });

// Virtual for checking if quiz is currently active
quizSchema.virtual('isCurrentlyActive').get(function() {
  const now = new Date();
  return this.isActive && 
         this.settings.startDate <= now && 
         this.settings.endDate >= now;
});

// Update updatedAt field before saving
quizSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Calculate total points for the quiz
quizSchema.virtual('totalPoints').get(function() {
  return this.questions.reduce((total, question) => total + question.points, 0);
});

module.exports = mongoose.model('Quiz', quizSchema);