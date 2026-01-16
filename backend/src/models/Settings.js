const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
  siteName: { type: String, default: 'منصة الاختبارات الذكية' },
  siteDescription: { type: String, default: 'منصة تعليمية لإجراء الاختبارات والكويزات التفاعلية' },
  maintenanceMode: { type: Boolean, default: false },
  registrationEnabled: { type: Boolean, default: true },
  maxUsersPerQuiz: { type: Number, default: 100 },
  defaultQuizDuration: { type: Number, default: 60 },
  autoApproveTeachers: { type: Boolean, default: false },
  emailNotifications: { type: Boolean, default: true },
  smsNotifications: { type: Boolean, default: false },
  backupFrequency: { type: String, enum: ['daily', 'weekly', 'monthly'], default: 'daily' },
  sessionTimeout: { type: Number, default: 30 },
  maxLoginAttempts: { type: Number, default: 5 },
  passwordMinLength: { type: Number, default: 8 },
  requirePasswordSpecialChars: { type: Boolean, default: true },
  enableTwoFactor: { type: Boolean, default: false },
}, { timestamps: true });

module.exports = mongoose.model('Settings', settingsSchema);
