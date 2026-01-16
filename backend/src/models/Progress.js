const mongoose = require('mongoose');

const progressSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true
  },
  // المحتوى المكتمل
  completedContents: [{
    content: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Content'
    },
    completedAt: {
      type: Date,
      default: Date.now
    },
    // للفيديوهات: آخر ثانية شاهدها
    lastWatchedSecond: {
      type: Number,
      default: 0
    }
  }],
  // آخر محتوى تم الوصول له
  lastAccessedContent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Content'
  },
  // النسبة المئوية للتقدم الكلي
  overallProgress: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  enrolledAt: {
    type: Date,
    default: Date.now
  },
  lastAccessedAt: {
    type: Date,
    default: Date.now
  }
});

// Indexes
progressSchema.index({ student: 1, course: 1 }, { unique: true });
progressSchema.index({ student: 1 });
progressSchema.index({ course: 1 });

// Method لتحديث التقدم
progressSchema.methods.markContentAsCompleted = function(contentId) {
  const alreadyCompleted = this.completedContents.some(
    item => item.content.toString() === contentId.toString()
  );
  
  if (!alreadyCompleted) {
    this.completedContents.push({ content: contentId });
    this.lastAccessedContent = contentId;
    this.lastAccessedAt = Date.now();
    return this.save();
  }
  return Promise.resolve(this);
};

// Method للتحقق من اكتمال محتوى
progressSchema.methods.isContentCompleted = function(contentId) {
  return this.completedContents.some(
    item => item.content.toString() === contentId.toString()
  );
};

module.exports = mongoose.model('Progress', progressSchema);