const mongoose = require('mongoose');

const chapterSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Chapter title is required'],
    trim: true,
    maxlength: [100, 'Title cannot exceed 100 characters']
  },
  description: {
    type: String,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true
  },
  // ترتيب الفصل داخل الكورس
  order: {
    type: Number,
    required: true,
    default: 0
  },
  isPublished: {
    type: Boolean,
    default: false
  },
  // هل الفصل مجاني (يمكن الوصول له بدون شراء الكورس)
  isFree: {
    type: Boolean,
    default: false
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
chapterSchema.index({ course: 1, order: 1 });
chapterSchema.index({ isPublished: 1 });

chapterSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Chapter', chapterSchema);