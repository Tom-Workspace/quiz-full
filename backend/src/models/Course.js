const mongoose = require('mongoose');

const courseSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Course title is required'],
    trim: true,
    maxlength: [100, 'Title cannot exceed 100 characters']
  },
  description: {
    type: String,
    required: [true, 'Course description is required'],
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  thumbnail: {
    type: String,
    default: null
  },
  instructor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  price: {
    type: Number,
    default: 0,
    min: [0, 'Price cannot be negative']
  },
  enrolledStudents: [{
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    enrolledAt: {
      type: Date,
      default: Date.now
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'completed', 'free'],
      default: 'pending'
    }
  }],
  isPublished: {
    type: Boolean,
    default: false
  },
  category: {
    type: String,
    enum: ['mathematics', 'science', 'english', 'arabic', 'physics', 'chemistry', 'biology', 'other'],
    default: 'other'
  },
  // ✅ CHANGED: بدل level عملنا academicYear
  // السنة الدراسية اللي الكورس مخصص ليها
  academicYear: {
    type: String,
    enum: ['first-secondary', 'second-secondary', 'third-secondary'],
    required: [true, 'Academic year is required']
  },
  order: {
    type: Number,
    default: 0
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

// Indexes
courseSchema.index({ instructor: 1 });
courseSchema.index({ isPublished: 1 });
courseSchema.index({ order: 1 });
courseSchema.index({ category: 1 });
// ✅ CHANGED: Index للسنة الدراسية بدل level
courseSchema.index({ academicYear: 1 });
courseSchema.index({ 'enrolledStudents.student': 1 });

courseSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

courseSchema.virtual('enrolledCount').get(function() {
  return this.enrolledStudents.length;
});

courseSchema.methods.isStudentEnrolled = function(studentId) {
  return this.enrolledStudents.some(
    enrollment => enrollment.student.toString() === studentId.toString()
  );
};

courseSchema.methods.enrollStudent = function(studentId, paymentStatus = 'pending') {
  if (!this.isStudentEnrolled(studentId)) {
    this.enrolledStudents.push({
      student: studentId,
      paymentStatus: paymentStatus
    });
    return this.save();
  }
  return Promise.resolve(this);
};

// ✅ NEW: Method للتحقق إذا الكورس متاح للطالب بناءً على سنته الدراسية
courseSchema.methods.isAvailableForStudent = function(studentAcademicYear) {
  return this.academicYear === studentAcademicYear && this.isPublished;
};

module.exports = mongoose.model('Course', courseSchema);