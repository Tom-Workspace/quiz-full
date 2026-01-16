const mongoose = require('mongoose');

const contentSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Content title is required'],
    trim: true,
    maxlength: [150, 'Title cannot exceed 150 characters']
  },
  chapter: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Chapter',
    required: true
  },
  type: {
    type: String,
    enum: ['video', 'file', 'quiz', 'text'],
    required: true
  },
  order: {
    type: Number,
    required: true,
    default: 0
  },
  
  // ========== للفيديوهات ==========
  video: {
    // ✅ NEW: الفيديو ممكن يكون لينك أو ملف مرفوع
    source: {
      type: String,
      enum: ['url', 'upload'], // ✅ لينك ولا رفع
      required: function() {
        return this.type === 'video';
      }
    },
    // ✅ لو اختار url
    url: {
      type: String,
      required: function() {
        return this.type === 'video' && this.video?.source === 'url';
      }
    },
    provider: {
      type: String,
      enum: ['youtube', 'vimeo', 'bunny', 'custom'],
      required: function() {
        return this.type === 'video' && this.video?.source === 'url';
      }
    },
    // ✅ لو اختار upload
    uploadedFile: {
      type: String, // path للملف المرفوع
      required: function() {
        return this.type === 'video' && this.video?.source === 'upload';
      }
    },
    fileName: {
      type: String
    },
    fileSize: {
      type: Number // بالبايتس
    },
    // ✅ مشترك بين النوعين
    duration: {
      type: Number, // بالثواني
      default: 0
    },
    quality: {
      type: String,
      enum: ['360p', '480p', '720p', '1080p', 'auto'],
      default: 'auto'
    }
  },
  
  // ========== للملفات ==========
  file: {
    // ✅ الملفات رفع فقط (مافيش لينكات)
    uploadedFile: {
      type: String, // path للملف المرفوع
      required: function() {
        return this.type === 'file';
      }
    },
    fileName: {
      type: String,
      required: function() {
        return this.type === 'file';
      }
    },
    fileType: {
      type: String,
      enum: ['pdf', 'doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx', 'image', 'zip', 'other'],
      required: function() {
        return this.type === 'file';
      }
    },
    fileSize: {
      type: Number, // بالبايتس
      required: function() {
        return this.type === 'file';
      }
    },
    mimeType: {
      type: String // مثلاً: application/pdf, image/jpeg
    }
  },
  
  // ========== للكويزات ==========
  quiz: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Quiz',
    required: function() {
      return this.type === 'quiz';
    }
  },
  
  // ========== للنصوص/الشرح ==========
  textContent: {
    type: String,
    required: function() {
      return this.type === 'text';
    }
  },
  
  isPublished: {
    type: Boolean,
    default: false
  },
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
contentSchema.index({ chapter: 1, order: 1 });
contentSchema.index({ type: 1 });
contentSchema.index({ isPublished: 1 });
contentSchema.index({ quiz: 1 });

contentSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// ✅ Virtual للحصول على URL الفيديو (سواء لينك أو مرفوع)
contentSchema.virtual('videoUrl').get(function() {
  if (this.type !== 'video') return null;
  
  if (this.video?.source === 'url') {
    return this.video.url;
  } else if (this.video?.source === 'upload') {
    // هترجع الـ path الكامل للملف المرفوع
    return this.video.uploadedFile ? `/uploads/videos/${this.video.uploadedFile}` : null;
  }
  return null;
});

// ✅ Virtual للحصول على URL الملف
contentSchema.virtual('fileUrl').get(function() {
  if (this.type !== 'file') return null;
  return this.file?.uploadedFile ? `/uploads/files/${this.file.uploadedFile}` : null;
});

// ✅ Method للحصول على بيانات الفيديو بشكل منظم
contentSchema.methods.getVideoData = function() {
  if (this.type !== 'video') return null;
  
  return {
    source: this.video?.source,
    url: this.video?.source === 'url' ? this.video.url : null,
    provider: this.video?.provider,
    uploadedFile: this.video?.source === 'upload' ? this.video.uploadedFile : null,
    fileName: this.video?.fileName,
    fileSize: this.video?.fileSize,
    duration: this.video?.duration,
    quality: this.video?.quality
  };
};

// ✅ Method للحصول على بيانات الملف بشكل منظم
contentSchema.methods.getFileData = function() {
  if (this.type !== 'file') return null;
  
  return {
    uploadedFile: this.file?.uploadedFile,
    fileName: this.file?.fileName,
    fileType: this.file?.fileType,
    fileSize: this.file?.fileSize,
    mimeType: this.file?.mimeType,
    downloadUrl: this.fileUrl
  };
};

module.exports = mongoose.model('Content', contentSchema);