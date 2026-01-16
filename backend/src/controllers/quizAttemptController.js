const Quiz = require('../models/Quiz');
const QuizAttempt = require('../models/QuizAttempt');
const cacheService = require('../utils/cache');

// Start quiz attempt
const startQuiz = async (req, res) => {
  try {
    const { quizId } = req.body;
    const studentId = req.user._id;

    // Get quiz
    const quiz = await Quiz.findById(quizId);
    if (!quiz) {
      return res.status(404).json({
        success: false,
        message: 'Quiz not found'
      });
    }

    // Check if quiz is active
    const now = new Date();
    if (!quiz.isActive || 
        quiz.settings.startDate > now || 
        quiz.settings.endDate < now) {
      return res.status(400).json({
        success: false,
        message: 'Quiz is not available'
      });
    }

    // Check attempt count
    const attemptCount = await QuizAttempt.getAttemptCount(quizId, studentId);
    if (attemptCount >= quiz.settings.maxAttempts) {
      return res.status(400).json({
        success: false,
        message: 'Maximum attempts reached'
      });
    }

    // Check for existing in-progress attempt
    let existingAttempt = await QuizAttempt.findOne({
      quiz: quizId,
      student: studentId,
      status: 'in-progress'
    });

    if (existingAttempt) {
      // Check if quiz allows resume
      if (!quiz.settings.allowResume) {
        return res.status(400).json({
          success: false,
          message: 'Cannot resume quiz'
        });
      }

      // Check if time expired
      const timeElapsed = Math.floor((now - existingAttempt.startedAt) / 1000 / 60);
      if (timeElapsed >= quiz.settings.duration) {
        existingAttempt.status = 'time-expired';
        await existingAttempt.save();
        
        return res.status(400).json({
          success: false,
          message: 'Quiz time has expired'
        });
      }

      const quizData = {
        ...quiz.toObject(),
        questions: quiz.questions.map(q => {
          const question = { ...q.toObject() };
          // Remove correct answers
          if (question.options) {
            question.options = question.options.map(option => ({
              _id: option._id?.toString?.() || String(option._id),
              text: option.text,
              imageUrl: option.imageUrl
            }));
          }
          delete question.correctAnswer;
          delete question.correctBoolean;
          return question;
        })
      };

      return res.json({
        success: true,
        message: 'Resuming existing attempt',
        data: {
          attempt: existingAttempt,
          quiz: quizData
        }
      });
    }

    // Create new attempt (handle concurrency)
    const newAttempt = new QuizAttempt({
      quiz: quizId,
      student: studentId,
      attemptNumber: attemptCount + 1,
      totalPoints: quiz.totalPoints,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    try {
      await newAttempt.save();

      const quizData = {
        ...quiz.toObject(),
        questions: quiz.questions.map(q => {
          const question = { ...q.toObject() };
          // Remove correct answers
          if (question.options) {
            question.options = question.options.map(option => ({
              _id: option._id?.toString?.() || String(option._id),
              text: option.text,
              imageUrl: option.imageUrl
            }));
          }
          delete question.correctAnswer;
          delete question.correctBoolean;
          return question;
        })
      };

      return res.status(201).json({
        success: true,
        message: 'Quiz started successfully',
        data: {
          attempt: newAttempt,
          quiz: quizData
        }
      });
    } catch (err) {
      // Handle duplicate attempt creation due to race condition
      if (err && err.code === 11000) {
        // Another request created the attempt concurrently; return that attempt for resume
        const concurrentAttempt = await QuizAttempt.findOne({
          quiz: quizId,
          student: studentId,
          status: 'in-progress'
        }).sort({ createdAt: -1 });

        if (concurrentAttempt) {
          const quizData = {
            ...quiz.toObject(),
            questions: quiz.questions.map(q => {
              const question = { ...q.toObject() };
              if (question.options) {
                question.options = question.options.map(option => ({
                  _id: option._id?.toString?.() || String(option._id),
                  text: option.text,
                  imageUrl: option.imageUrl
                }));
              }
              delete question.correctAnswer;
              delete question.correctBoolean;
              return question;
            })
          };

          return res.json({
            success: true,
            message: 'Resuming existing attempt',
            data: {
              attempt: concurrentAttempt,
              quiz: quizData
            }
          });
        }

        // If not found for any reason, recalculate attempt number and try once more
        const freshCount = await QuizAttempt.getAttemptCount(quizId, studentId);
        const fallbackAttempt = new QuizAttempt({
          quiz: quizId,
          student: studentId,
          attemptNumber: freshCount + 1,
          totalPoints: quiz.totalPoints,
          ipAddress: req.ip,
          userAgent: req.get('User-Agent')
        });
        await fallbackAttempt.save();

        const quizData = {
          ...quiz.toObject(),
          questions: quiz.questions.map(q => {
            const question = { ...q.toObject() };
            if (question.options) {
              question.options = question.options.map(option => ({
                _id: option._id?.toString?.() || String(option._id),
                text: option.text,
                imageUrl: option.imageUrl
              }));
            }
            delete question.correctAnswer;
            delete question.correctBoolean;
            return question;
          })
        };

        return res.status(201).json({
          success: true,
          message: 'Quiz started successfully',
          data: { attempt: fallbackAttempt, quiz: quizData }
        });
      }

      throw err;
    }
  } catch (error) {
    console.error('Start quiz error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to start quiz'
    });
  }
};

// Submit answer for a question
const submitAnswer = async (req, res) => {
  try {
    const { attemptId } = req.params;
    const { questionId, answer, timeSpent } = req.body;
    const studentId = req.user._id;

    // Get attempt
    const attempt = await QuizAttempt.findOne({
      _id: attemptId,
      student: studentId,
      status: 'in-progress'
    });

    if (!attempt) {
      return res.status(404).json({
        success: false,
        message: 'Quiz attempt not found or already completed'
      });
    }

    // Get quiz
    const quiz = await Quiz.findById(attempt.quiz);
    if (!quiz) {
      return res.status(404).json({
        success: false,
        message: 'Quiz not found'
      });
    }

    // Check if time expired
    const now = new Date();
    const timeElapsed = Math.floor((now - attempt.startedAt) / 1000 / 60);
    if (timeElapsed >= quiz.settings.duration) {
      attempt.status = 'time-expired';
      await attempt.save();
      
      return res.status(400).json({
        success: false,
        message: 'Quiz time has expired'
      });
    }

    // Find question
    const question = quiz.questions.id(questionId);
    if (!question) {
      return res.status(404).json({
        success: false,
        message: 'Question not found'
      });
    }

    // Check if answer already exists
    const existingAnswerIndex = attempt.answers.findIndex(
      a => a.questionId.toString() === questionId
    );

    // Calculate if answer is correct and points
    let isCorrect = false;
    let points = 0;

    if (question.answerType === 'text-answer') {
      // For text answers, do simple string comparison (case-insensitive)
      isCorrect = answer.toLowerCase().trim() === question.correctAnswer.toLowerCase().trim();
    } else if (question.answerType === 'single-choice') {
      // For single choice, check if selected option is correct
      const selectedOption = question.options.find(opt => opt._id.toString() === answer);
      isCorrect = selectedOption && selectedOption.isCorrect;
    } else if (question.answerType === 'multiple-choice') {
      // For multiple choice, check if all correct options are selected
      const correctOptions = question.options.filter(opt => opt.isCorrect).map(opt => opt._id.toString());
      const selectedOptions = Array.isArray(answer) ? answer : [answer];
      isCorrect = correctOptions.length === selectedOptions.length &&
                  correctOptions.every(opt => selectedOptions.includes(opt));
    } else if (question.answerType === 'image-selection') {
      // Similar to single choice but for images
      const selectedOption = question.options.find(opt => opt._id.toString() === answer);
      isCorrect = selectedOption && selectedOption.isCorrect;
    } else if (question.answerType === 'true-false') {
      // For true/false, compare boolean value (support string 'true'/'false' fallback)
      let ansBool = typeof answer === 'boolean' ? answer : undefined;
      if (typeof answer === 'string') {
        if (answer.toLowerCase() === 'true') ansBool = true;
        else if (answer.toLowerCase() === 'false') ansBool = false;
      }
      if (typeof ansBool === 'boolean') {
        isCorrect = ansBool === question.correctBoolean;
      } else {
        isCorrect = false;
      }
    }

    // Calculate points
    points = isCorrect ? question.points : 0;

    const answerData = {
      questionId,
      answer,
      isCorrect,
      points,
      timeSpent: timeSpent || 0,
      answeredAt: new Date()
    };

    if (existingAnswerIndex >= 0) {
      // Update existing answer
      attempt.answers[existingAnswerIndex] = answerData;
    } else {
      // Add new answer
      attempt.answers.push(answerData);
    }

    // Update current question index
    const currentIndex = quiz.questions.findIndex(q => q._id.toString() === questionId);
    if (currentIndex >= 0) {
      attempt.currentQuestionIndex = Math.max(attempt.currentQuestionIndex, currentIndex + 1);
    }

    await attempt.save();

    res.json({
      success: true,
      message: 'Answer submitted successfully',
      data: {
        isCorrect,
        points,
        currentQuestionIndex: attempt.currentQuestionIndex
      }
    });
  } catch (error) {
    console.error('Submit answer error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit answer'
    });
  }
};

// Complete quiz attempt
const completeQuiz = async (req, res) => {
  try {
    const { attemptId } = req.params;
    const studentId = req.user._id;

    // Get attempt
    const attempt = await QuizAttempt.findOne({
      _id: attemptId,
      student: studentId,
      status: 'in-progress'
    });

    if (!attempt) {
      return res.status(404).json({
        success: false,
        message: 'Quiz attempt not found or already completed'
      });
    }

    // Calculate total score
    const totalScore = attempt.answers.reduce((sum, answer) => sum + answer.points, 0);
    
    // Update attempt
    attempt.status = 'completed';
    attempt.score = totalScore;
    attempt.completedAt = new Date();
    attempt.timeSpent = Math.floor((attempt.completedAt - attempt.startedAt) / 1000);

    await attempt.save();

    // Get quiz for response
    const quiz = await Quiz.findById(attempt.quiz);
    
    // Prepare response based on quiz settings
    let showAnswers = false;
    let showScore = false;

    if (quiz.settings.showScore === 'immediately') {
      showScore = true;
    }

    if (quiz.settings.showAnswers === 'immediately') {
      showAnswers = true;
    }

    const response = {
      success: true,
      message: 'Quiz completed successfully',
      data: {
        attempt: {
          _id: attempt._id,
          score: showScore ? attempt.score : undefined,
          totalPoints: attempt.totalPoints,
          percentage: showScore ? attempt.percentage : undefined,
          timeSpent: attempt.timeSpent,
          completedAt: attempt.completedAt,
          status: attempt.status
        }
      }
    };

    if (showAnswers) {
      response.data.answers = attempt.answers;
      response.data.correctAnswers = quiz.questions.map(q => ({
        questionId: q._id,
        correctAnswer: q.correctAnswer,
        correctOptions: q.options ? q.options.filter(opt => opt.isCorrect) : []
      }));
    }

    res.json(response);
  } catch (error) {
    console.error('Complete quiz error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to complete quiz'
    });
  }
};

// Get user's quiz attempts
const getUserAttempts = async (req, res) => {
  try {
    const { quizId } = req.query;
    const { page = 1, limit = 10 } = req.query;
    const studentId = req.user._id;

    // Build filter
    const filter = { student: studentId };
    if (quizId) {
      filter.quiz = quizId;
    }

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Get attempts
    const attempts = await QuizAttempt.find(filter)
      .populate('quiz', 'title description settings')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await QuizAttempt.countDocuments(filter);

    res.json({
      success: true,
      data: {
        attempts,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / limit),
          total
        }
      }
    });
  } catch (error) {
    console.error('Get user attempts error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get quiz attempts'
    });
  }
};

// Get quiz attempts (Teacher/Admin only)
const getQuizAttempts = async (req, res) => {
  try {
    const { quizId } = req.params;
    const { page = 1, limit = 10, status, studentId } = req.query;

    // Get quiz and check permissions
    const quiz = await Quiz.findById(quizId);
    if (!quiz) {
      return res.status(404).json({
        success: false,
        message: 'Quiz not found'
      });
    }

    if (req.user.role === 'teacher' && 
        quiz.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Build filter
    const filter = { quiz: quizId };
    if (status) {
      filter.status = status;
    }
    if (studentId) {
      filter.student = studentId;
    }

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Get attempts
    const attempts = await QuizAttempt.find(filter)
      .populate('student', 'name phone')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await QuizAttempt.countDocuments(filter);

    res.json({
      success: true,
      data: {
        attempts,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / limit),
          total
        }
      }
    });
  } catch (error) {
    console.error('Get quiz attempts error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get quiz attempts'
    });
  }
};

// Get detailed attempt (Teacher/Admin only)
const getAttemptDetails = async (req, res) => {
  try {
    const { attemptId } = req.params;
    const attempt = await QuizAttempt.findById(attemptId)
      .populate('student', 'name phone')
      .populate('quiz');

    if (!attempt) {
      return res.status(404).json({
        success: false,
        message: 'Attempt not found'
      });
    }

    // Check permissions
    if (req.user.role === 'teacher' && 
        attempt.quiz.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    res.json({
      success: true,
      data: {
        attempt
      }
    });
  } catch (error) {
    console.error('Get attempt details error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get attempt details'
    });
  }
};

// Get attempts for a specific student (Teacher/Admin only)
const getStudentAttempts = async (req, res) => {
  try {
    const { studentId } = req.params;
    const { page = 1, limit = 10, status, quizId } = req.query;

    const filter = { student: studentId };
    if (status) filter.status = status;
    if (quizId) filter.quiz = quizId;

    const skip = (page - 1) * limit;

    const attempts = await QuizAttempt.find(filter)
      .populate('quiz', 'title')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await QuizAttempt.countDocuments(filter);

    res.json({
      success: true,
      data: {
        attempts,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / limit),
          total
        }
      }
    });
  } catch (error) {
    console.error('Get student attempts error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get student attempts'
    });
  }
};

// Get overall attempts statistics (Teacher/Admin only)
const getAttemptsStats = async (req, res) => {
  try {
    const [stats] = await QuizAttempt.aggregate([
      {
        $group: {
          _id: null,
          totalAttempts: { $sum: 1 },
          completedAttempts: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
          averageScore: { $avg: '$score' },
          averagePercentage: { $avg: '$percentage' }
        }
      }
    ]);

    const data = stats || {
      totalAttempts: 0,
      completedAttempts: 0,
      averageScore: 0,
      averagePercentage: 0
    };
    data.completionRate = data.totalAttempts > 0 ? Math.round((data.completedAttempts / data.totalAttempts) * 100) : 0;

    res.json({ success: true, data });
  } catch (error) {
    console.error('Get attempts stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get attempts statistics'
    });
  }
};

// Get detailed attempt for its owner (Student only)
const getOwnAttemptDetails = async (req, res) => {
  try {
    const { attemptId } = req.params;
    const attempt = await QuizAttempt.findById(attemptId)
      .populate('quiz');

    if (!attempt) {
      return res.status(404).json({ success: false, message: 'Attempt not found' });
    }

    if (attempt.student.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    res.json({ success: true, data: { attempt } });
  } catch (error) {
    console.error('Get own attempt details error:', error);
    res.status(500).json({ success: false, message: 'Failed to get attempt details' });
  }
};

// Log cheating attempt/warning
const logCheatingAttempt = async (req, res) => {
  try {
    const { attemptId } = req.params;
    const { message } = req.body || {};

    const attempt = await QuizAttempt.findById(attemptId).populate('quiz');
    if (!attempt) {
      return res.status(404).json({ success: false, message: 'Attempt not found' });
    }

    // Permission: owner, teacher who owns quiz, or admin
    const isOwner = attempt.student.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';
    const isTeacherOwner = req.user.role === 'teacher' && attempt.quiz && attempt.quiz.createdBy.toString() === req.user._id.toString();
    if (!isOwner && !isAdmin && !isTeacherOwner) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    attempt.cheatLogs = attempt.cheatLogs || [];
    attempt.cheatLogs.push({ message: message || 'Cheating event' });
    await attempt.save();

    res.json({ success: true, message: 'Cheating log recorded' });
  } catch (error) {
    console.error('Log cheating attempt error:', error);
    res.status(500).json({ success: false, message: 'Failed to log cheating attempt' });
  }
};

module.exports = {
  startQuiz,
  submitAnswer,
  completeQuiz,
  getUserAttempts,
  getQuizAttempts,
  getAttemptDetails,
  getStudentAttempts,
  getAttemptsStats,
  getOwnAttemptDetails,
  logCheatingAttempt
};
