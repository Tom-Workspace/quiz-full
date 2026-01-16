const Quiz = require('../models/Quiz');
const QuizAttempt = require('../models/QuizAttempt');
const cacheService = require('../utils/cache');

// Create new quiz (Teacher/Admin only)
const createQuiz = async (req, res) => {
  try {
    const quizData = {
      ...req.body,
      createdBy: req.user._id
    };

    // Validate dates
    const startDate = new Date(quizData.settings.startDate);
    const endDate = new Date(quizData.settings.endDate);

    if (startDate >= endDate) {
      return res.status(400).json({
        success: false,
        message: 'End date must be after start date'
      });
    }

    const quiz = new Quiz(quizData);
    await quiz.save();

    // Clear active quizzes cache
    await cacheService.del(cacheService.keys.activeQuizzes());

    res.status(201).json({
      success: true,
      message: 'Quiz created successfully',
      data: {
        quiz
      }
    });
  } catch (error) {
    console.error('Create quiz error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create quiz'
    });
  }
};

// Get all quizzes with filters
const getAllQuizzes = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      search, 
      isActive, 
      createdBy,
      activeOnly = false 
    } = req.query;

    // Build filter
    const filter = {};
    
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    if (isActive !== undefined) {
      filter.isActive = isActive === 'true';
    }

    if (createdBy) {
      filter.createdBy = createdBy;
    }

    // For students, only show currently active quizzes
    if (req.user.role === 'student' || activeOnly === 'true') {
      const now = new Date();
      filter.isActive = true;
      filter['settings.startDate'] = { $lte: now };
      filter['settings.endDate'] = { $gte: now };
    }

    // For teachers, only show their own quizzes (unless admin)
    if (req.user.role === 'teacher') {
      filter.createdBy = req.user._id;
    }

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Try to get from cache for active quizzes
    let quizzes;
    const cacheKey = `quizzes:${JSON.stringify(filter)}:${page}:${limit}`;
    
    if (activeOnly === 'true' || req.user.role === 'student') {
      quizzes = await cacheService.get(cacheKey);
    }

    if (!quizzes) {
      quizzes = await Quiz.find(filter)
        .populate('createdBy', 'name phone')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit));

      // Cache active quizzes for 5 minutes
      if (activeOnly === 'true' || req.user.role === 'student') {
        await cacheService.set(cacheKey, quizzes, 300);
      }
    }

    const total = await Quiz.countDocuments(filter);

    res.json({
      success: true,
      data: {
        quizzes,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / limit),
          total
        }
      }
    });
  } catch (error) {
    console.error('Get all quizzes error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get quizzes'
    });
  }
};

// Get quiz by ID
const getQuizById = async (req, res) => {
  try {
    const { quizId } = req.params;
    const { includeAnswers = false } = req.query;

    // Try to get from cache first
    let quiz = await cacheService.get(cacheService.keys.quiz(quizId));

    if (!quiz) {
      quiz = await Quiz.findById(quizId).populate('createdBy', 'name phone');
      
      if (!quiz) {
        return res.status(404).json({
          success: false,
          message: 'Quiz not found'
        });
      }

      // Cache quiz for 10 minutes
      await cacheService.set(cacheService.keys.quiz(quizId), quiz, 600);
    }

    // Check permissions
    if (req.user.role === 'student') {
      // Students can only see active quizzes
      const now = new Date();
      if (!quiz.isActive || 
          quiz.settings.startDate > now || 
          quiz.settings.endDate < now) {
        return res.status(403).json({
          success: false,
          message: 'Quiz not available'
        });
      }

      // Remove correct answers for students (unless they should see them)
      if (!includeAnswers || quiz.settings.showAnswers === 'never') {
        quiz.questions = quiz.questions.map(question => {
          // Handle both Mongoose documents and plain objects
          const questionCopy = typeof question.toObject === 'function' 
            ? { ...question.toObject() } 
            : { ...question };
          if (questionCopy.options) {
            questionCopy.options = questionCopy.options.map(option => ({
              text: option.text,
              imageUrl: option.imageUrl
            }));
          }
          delete questionCopy.correctAnswer;
          return questionCopy;
        });
      }
    } else if (req.user.role === 'teacher') {
      // Teachers can only see their own quizzes (unless admin)
      if (quiz.createdBy._id.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }
    }

    res.json({
      success: true,
      data: {
        quiz
      }
    });
  } catch (error) {
    console.error('Get quiz by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get quiz'
    });
  }
};

// Update quiz (Teacher/Admin only)
const updateQuiz = async (req, res) => {
  try {
    const { quizId } = req.params;

    const quiz = await Quiz.findById(quizId);
    if (!quiz) {
      return res.status(404).json({
        success: false,
        message: 'Quiz not found'
      });
    }

    // Check permissions
    if (req.user.role === 'teacher' && 
        quiz.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Validate dates if provided
    if (req.body.settings) {
      const startDate = new Date(req.body.settings.startDate || quiz.settings.startDate);
      const endDate = new Date(req.body.settings.endDate || quiz.settings.endDate);

      if (startDate >= endDate) {
        return res.status(400).json({
          success: false,
          message: 'End date must be after start date'
        });
      }
    }

    // Update quiz
    Object.assign(quiz, req.body);
    await quiz.save();

    // Clear caches
    await cacheService.del(cacheService.keys.quiz(quizId));
    await cacheService.del(cacheService.keys.activeQuizzes());

    res.json({
      success: true,
      message: 'Quiz updated successfully',
      data: {
        quiz
      }
    });
  } catch (error) {
    console.error('Update quiz error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update quiz'
    });
  }
};

// Delete quiz (Teacher/Admin only)
const deleteQuiz = async (req, res) => {
  try {
    const { quizId } = req.params;

    const quiz = await Quiz.findById(quizId);
    if (!quiz) {
      return res.status(404).json({
        success: false,
        message: 'Quiz not found'
      });
    }

    // Check permissions
    if (req.user.role === 'teacher' && 
        quiz.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Delete quiz attempts
    await QuizAttempt.deleteMany({ quiz: quizId });

    // Delete quiz
    await Quiz.findByIdAndDelete(quizId);

    // Clear caches
    await cacheService.del(cacheService.keys.quiz(quizId));
    await cacheService.del(cacheService.keys.activeQuizzes());

    res.json({
      success: true,
      message: 'Quiz deleted successfully'
    });
  } catch (error) {
    console.error('Delete quiz error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete quiz'
    });
  }
};

// Get quiz statistics (Teacher/Admin only)
const getQuizStats = async (req, res) => {
  try {
    const { quizId } = req.params;

    const quiz = await Quiz.findById(quizId);
    if (!quiz) {
      return res.status(404).json({
        success: false,
        message: 'Quiz not found'
      });
    }

    // Check permissions
    if (req.user.role === 'teacher' && 
        quiz.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Get quiz statistics
    const stats = await QuizAttempt.aggregate([
      { $match: { quiz: quiz._id } },
      {
        $group: {
          _id: null,
          totalAttempts: { $sum: 1 },
          completedAttempts: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
          },
          averageScore: { $avg: '$score' },
          averagePercentage: { $avg: '$percentage' },
          averageTimeSpent: { $avg: '$timeSpent' },
          highestScore: { $max: '$score' },
          lowestScore: { $min: '$score' }
        }
      }
    ]);

    const uniqueStudents = await QuizAttempt.distinct('student', { quiz: quizId });

    res.json({
      success: true,
      data: {
        quiz: {
          title: quiz.title,
          totalQuestions: quiz.questions.length,
          totalPoints: quiz.totalPoints
        },
        stats: stats[0] || {
          totalAttempts: 0,
          completedAttempts: 0,
          averageScore: 0,
          averagePercentage: 0,
          averageTimeSpent: 0,
          highestScore: 0,
          lowestScore: 0
        },
        uniqueStudents: uniqueStudents.length
      }
    });
  } catch (error) {
    console.error('Get quiz stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get quiz statistics'
    });
  }
};

// Get global quizzes statistics (Teacher/Admin only)
const getAllStats = async (req, res) => {
  try {
    const [totalQuizzes, activeQuizzesDoc] = await Promise.all([
      Quiz.countDocuments(),
      Quiz.aggregate([
        { $match: { isActive: true } },
        { $count: 'count' }
      ])
    ]);

    const activeQuizzes = activeQuizzesDoc[0]?.count || 0;

    // Average questions and total points across quizzes (optional insights)
    const insights = await Quiz.aggregate([
      {
        $project: {
          questionsCount: { $size: '$questions' },
          totalPoints: { $sum: '$questions.points' }
        }
      },
      {
        $group: {
          _id: null,
          avgQuestions: { $avg: '$questionsCount' },
          avgTotalPoints: { $avg: '$totalPoints' }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        totalQuizzes,
        activeQuizzes,
        avgQuestions: Math.round((insights[0]?.avgQuestions || 0) * 10) / 10,
        avgTotalPoints: Math.round((insights[0]?.avgTotalPoints || 0) * 10) / 10,
      }
    });
  } catch (error) {
    console.error('Get all quizzes stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get quizzes statistics'
    });
  }
};

// Clone quiz (Teacher/Admin only)
const cloneQuiz = async (req, res) => {
  try {
    const { quizId } = req.params;
    const source = await Quiz.findById(quizId);
    if (!source) {
      return res.status(404).json({ success: false, message: 'Quiz not found' });
    }

    // Teachers can only clone their own quizzes
    if (req.user.role === 'teacher' && source.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const cloned = new Quiz({
      title: `نسخة من ${source.title}`,
      description: source.description,
      createdBy: req.user._id,
      questions: JSON.parse(JSON.stringify(source.questions)),
      settings: JSON.parse(JSON.stringify(source.settings)),
      isActive: false
    });
    await cloned.save();

    res.status(201).json({ success: true, message: 'Quiz cloned successfully', data: { quiz: cloned } });
  } catch (error) {
    console.error('Clone quiz error:', error);
    res.status(500).json({ success: false, message: 'Failed to clone quiz' });
  }
};

module.exports = {
  createQuiz,
  getAllQuizzes,
  getQuizById,
  updateQuiz,
  deleteQuiz,
  getQuizStats,
  getAllStats,
  cloneQuiz
};
