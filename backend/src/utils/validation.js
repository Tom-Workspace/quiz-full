const { z } = require('zod');

// User validation schemas
const registerSchema = z.object({
  name: z.string()
    .min(2, 'Name must be at least 2 characters')
    .max(50, 'Name cannot exceed 50 characters')
    .trim(),
  phone: z.string()
    .regex(/^01[0-9]{9}$/, 'Please enter a valid Egyptian phone number'),
  age: z.union([z.number(), z.string()])
    .transform((val) => {
      const num = typeof val === 'string' ? parseInt(val, 10) : val;
      if (isNaN(num)) throw new Error('Age must be a valid number');
      return num;
    })
    .refine((val) => val >= 5 && val <= 100, 'Age must be between 5 and 100'),
  fatherPhone: z.string()
    .regex(/^01[0-9]{9}$/, 'Please enter a valid Egyptian phone number')
    .optional(),
  password: z.string()
    .min(6, 'Password must be at least 6 characters')
    .max(100, 'Password cannot exceed 100 characters')
});

const loginSchema = z.object({
  phone: z.string()
    .regex(/^01[0-9]{9}$/, 'Please enter a valid Egyptian phone number'),
  password: z.string()
    .min(1, 'Password is required')
});

const updateUserSchema = z.object({
  name: z.string()
    .min(2, 'Name must be at least 2 characters')
    .max(50, 'Name cannot exceed 50 characters')
    .trim()
    .optional(),
  age: z.union([z.number(), z.string()])
    .transform((val) => {
      const num = typeof val === 'string' ? parseInt(val, 10) : val;
      if (isNaN(num)) throw new Error('Age must be a valid number');
      return num;
    })
    .refine((val) => val >= 5 && val <= 100, 'Age must be between 5 and 100')
    .optional(),
  fatherPhone: z.string()
    .regex(/^01[0-9]{9}$/, 'Please enter a valid Egyptian phone number')
    .optional()
});

// Quiz validation schemas
const questionSchema = z.object({
  type: z.enum(['text', 'image', 'audio']),
  content: z.string().min(1, 'Question content is required'),
  mediaUrl: z.string().url().optional(),
  answerType: z.enum(['single-choice', 'multiple-choice', 'image-selection', 'text-answer', 'true-false']),
  options: z.array(z.object({
    text: z.string().optional(),
    imageUrl: z.string().url().optional(),
    isCorrect: z.boolean().default(false)
  })).optional(),
  correctAnswer: z.union([z.string(), z.array(z.string()), z.object({}).passthrough()]).optional(),
  // For true/false questions
  correctBoolean: z.boolean().optional(),
  points: z.number().min(0).default(1),
  timeLimit: z.number().min(10).default(60)
}).superRefine((val, ctx) => {
  // text-answer requires correctAnswer string
  if (val.answerType === 'text-answer') {
    if (!val.correctAnswer || typeof val.correctAnswer !== 'string' || !val.correctAnswer.trim()) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['correctAnswer'], message: 'correctAnswer is required for text-answer' });
    }
  }

  // true-false requires correctBoolean
  if (val.answerType === 'true-false') {
    if (typeof val.correctBoolean !== 'boolean') {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['correctBoolean'], message: 'correctBoolean is required for true-false' });
    }
  }

  // choice-based types require options
  const isChoice = ['single-choice', 'multiple-choice', 'image-selection'].includes(val.answerType);
  if (isChoice) {
    if (!Array.isArray(val.options) || val.options.length < 2) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['options'], message: 'At least two options are required' });
    } else {
      const correctCount = val.options.filter(o => o && o.isCorrect).length;
      if (val.answerType === 'single-choice' || val.answerType === 'image-selection') {
        if (correctCount !== 1) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['options'], message: 'Exactly one correct option is required' });
        }
      }
      if (val.answerType === 'multiple-choice') {
        if (correctCount < 1) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['options'], message: 'At least one correct option is required' });
        }
      }
    }
  }
});

const quizSchema = z.object({
  title: z.string()
    .min(1, 'Quiz title is required')
    .max(100, 'Title cannot exceed 100 characters')
    .trim(),
  description: z.string()
    .max(500, 'Description cannot exceed 500 characters')
    .trim()
    .optional(),
  questions: z.array(questionSchema).min(1, 'At least one question is required'),
  settings: z.object({
    startDate: z.string().datetime(),
    endDate: z.string().datetime(),
    duration: z.number().min(1, 'Duration must be at least 1 minute'),
    maxAttempts: z.number().min(1).default(1),
    showAnswers: z.enum(['immediately', 'after-quiz-ends', 'never']).default('after-quiz-ends'),
    showScore: z.enum(['immediately', 'after-quiz-ends', 'never']).default('immediately'),
    allowResume: z.boolean().default(true),
    shuffleQuestions: z.boolean().default(false),
    shuffleOptions: z.boolean().default(false)
  })
});

const updateQuizSchema = quizSchema.partial();

// Quiz attempt validation schemas
const submitAnswerSchema = z.object({
  questionId: z.string().min(1, 'Question ID is required'),
  answer: z.union([z.string(), z.array(z.string()), z.boolean(), z.object({}).passthrough()]),
  timeSpent: z.number().min(0).default(0)
});

const startQuizSchema = z.object({
  quizId: z.string().min(1, 'Quiz ID is required')
});

// Admin validation objectschemas
const updateUserRoleSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  role: z.enum(['student', 'teacher', 'admin'])
});

const approveUserSchema = z.object({
  approved: z.boolean()
});

// Notification validation schemas
const createNotificationSchema = z.object({
  title: z.string().min(1, 'Title is required').max(100, 'Title cannot exceed 100 characters'),
  message: z.string().min(1, 'Message is required').max(500, 'Message cannot exceed 500 characters'),
  type: z.enum(['info', 'warning', 'success', 'error']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  recipients: z.array(z.enum(['all', 'students', 'teachers', 'admins'])).min(1, 'At least one recipient is required'),
  targetUsers: z.array(z.string()).optional(),
  expiresAt: z.string().datetime().optional()
});

const updateNotificationSchema = z.object({
  title: z.string().min(1, 'Title is required').max(100, 'Title cannot exceed 100 characters').optional(),
  message: z.string().min(1, 'Message is required').max(500, 'Message cannot exceed 500 characters').optional(),
  type: z.enum(['info', 'warning', 'success', 'error']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  isActive: z.boolean().optional()
});

const updateUserStatusSchema = z.object({
  isActive: z.boolean()
});

// Validation middleware
const validate = (schema) => {
  return (req, res, next) => {
    try {
      const validatedData = schema.parse(req.body); // هيعمل validation على body
      req.body = validatedData; // يخزن البيانات بعد التأكد منها
      next();
    } catch (error) {
      // لو الخطأ جاي من Zod
      if (error && error.errors && Array.isArray(error.errors)) {
        const errors = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message
        }));
        return res.status(400).json({
          success: false,
          message: 'Validation error',
          errors
        });
      }

      // لو مش ZodError (زي body مش JSON أو خطأ غير متوقع)
      console.error("Unexpected validation error:", error);
      next(error);
    }
  };
};

module.exports = {
  validate,
  registerSchema,
  loginSchema,
  updateUserSchema,
  quizSchema,
  updateQuizSchema,
  submitAnswerSchema,
  startQuizSchema,
  updateUserRoleSchema,
  approveUserSchema,
  createNotificationSchema,
  updateNotificationSchema,
  updateUserStatusSchema
};
