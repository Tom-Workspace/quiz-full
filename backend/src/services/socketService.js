const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const QuizAttempt = require('../models/QuizAttempt');
const Quiz = require('../models/Quiz');

class SocketService {
  constructor() {
    this.io = null;
    this.onlineUsers = new Map(); // Map to store userId -> socket info
  }

  init(server) {
    this.io = new Server(server, {
      cors: {
        origin: function (origin, callback) {
          const allowedOrigins = [
            'http://localhost:3000',
            'http://localhost:3001',
            process.env.FRONTEND_URL
          ].filter(Boolean);
          
          if (!origin || allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
          } else {
            callback(new Error('Not allowed by CORS'));
          }
        },
        credentials: true,
        methods: ['GET', 'POST']
      },
      pingTimeout: 60000,
      pingInterval: 25000
    });

    // Authentication middleware
    this.io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
        
        if (!token) {
          return next(new Error('Authentication token required'));
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.userId).select('-password -refreshToken');
        
        if (!user) {
          return next(new Error('User not found'));
        }

        socket.userId = user._id.toString();
        socket.user = user;
        next();
      } catch (error) {
        next(new Error('Authentication failed'));
      }
    });

    this.io.on('connection', (socket) => {
      this.handleConnection(socket);
    });

    console.log('✅ Socket.IO initialized');
  }

  async handleConnection(socket) {
    const userId = socket.userId;
    const user = socket.user;

    console.log(`👤 User connected: ${user.name} (${userId})`);

    // Update user online status in database
    await User.findByIdAndUpdate(userId, {
      isOnline: true,
      lastSeen: new Date()
    });

    // Store user in online users map
    this.onlineUsers.set(userId, {
      socketId: socket.id,
      user: {
        _id: user._id,
        name: user.name,
        role: user.role
      },
      connectedAt: new Date()
    });

    // Join role-based room
    socket.join(`role_${user.role}`);
    
    // Join user-specific room
    socket.join(`user_${userId}`);

    // Notify other users about this user coming online
    this.broadcastUserOnline(user);

    // Send current online users to the newly connected user
    socket.emit('online_users', Array.from(this.onlineUsers.values()).map(u => u.user));

    // Handle real-time events
    this.setupEventHandlers(socket);

    // Handle disconnection
    socket.on('disconnect', () => {
      this.handleDisconnection(socket);
    });
  }

  async handleDisconnection(socket) {
    const userId = socket.userId;
    const user = socket.user;

    if (!userId) return;

    console.log(`👤 User disconnected: ${user.name} (${userId})`);

    // Remove from online users
    this.onlineUsers.delete(userId);

    // Update user offline status in database
    await User.findByIdAndUpdate(userId, {
      isOnline: false,
      lastSeen: new Date()
    });

    // Notify other users about this user going offline
    this.broadcastUserOffline(userId);
  }

  setupEventHandlers(socket) {
    const userId = socket.userId;
    
    // Quiz-related events
    socket.on('join_quiz', (quizId) => {
      socket.join(`quiz_${quizId}`);
      console.log(`User ${userId} joined quiz ${quizId}`);
    });

    socket.on('leave_quiz', (quizId) => {
      socket.leave(`quiz_${quizId}`);
      console.log(`User ${userId} left quiz ${quizId}`);
    });

    // Activity tracking
    socket.on('user_activity', async (activityData) => {
      // Update last seen timestamp
      await User.findByIdAndUpdate(userId, {
        lastSeen: new Date()
      });

      // Broadcast activity to admins/teachers
      this.io.to('role_admin').to('role_teacher').emit('user_activity_update', {
        userId,
        activity: activityData,
        timestamp: new Date()
      });
    });

    // Real-time quiz progress
    socket.on('quiz_progress', (data) => {
      // Broadcast to quiz supervisors (teachers/admins)
      socket.to('role_admin').to('role_teacher').emit('student_progress', {
        userId,
        quizId: data.quizId,
        progress: data.progress,
        timestamp: new Date()
      });
    });

    // Save answer (autosave) - persists answer to DB
    socket.on('save_answer', async (payload) => {
      try {
        const { attemptId, questionId, answer, timeSpent } = payload || {};
        if (!attemptId || !questionId) return;

        // Load attempt and quiz
        const attempt = await QuizAttempt.findById(attemptId);
        if (!attempt) return;
        if (attempt.student.toString() !== userId.toString()) return; // permission

        const quiz = await Quiz.findById(attempt.quiz);
        if (!quiz) return;
        const question = quiz.questions.id(questionId);
        if (!question) return;

        // Evaluate correctness similar to controller
        let isCorrect = false;
        if (question.answerType === 'text-answer') {
          if (typeof answer === 'string' && typeof question.correctAnswer === 'string') {
            isCorrect = answer.toLowerCase().trim() === question.correctAnswer.toLowerCase().trim();
          }
        } else if (question.answerType === 'single-choice' || question.answerType === 'image-selection') {
          const selectedOption = question.options.find(opt => opt._id.toString() === String(answer));
          isCorrect = !!(selectedOption && selectedOption.isCorrect);
        } else if (question.answerType === 'multiple-choice') {
          const correctOptions = question.options.filter(opt => opt.isCorrect).map(opt => opt._id.toString());
          const selectedOptions = Array.isArray(answer) ? answer.map(String) : [String(answer)];
          isCorrect = correctOptions.length === selectedOptions.length && correctOptions.every(opt => selectedOptions.includes(opt));
        } else if (question.answerType === 'true-false') {
          let ansBool = typeof answer === 'boolean' ? answer : undefined;
          if (typeof answer === 'string') {
            if (answer.toLowerCase() === 'true') ansBool = true;
            else if (answer.toLowerCase() === 'false') ansBool = false;
          }
          if (typeof ansBool === 'boolean') {
            isCorrect = ansBool === question.correctBoolean;
          }
        }

        const points = isCorrect ? (question.points || 0) : 0;

        // Upsert answer
        const idx = attempt.answers.findIndex(a => a.questionId.toString() === questionId.toString());
        if (idx >= 0) {
          attempt.answers[idx].answer = answer;
          attempt.answers[idx].isCorrect = isCorrect;
          attempt.answers[idx].points = points;
          attempt.answers[idx].timeSpent = (attempt.answers[idx].timeSpent || 0) + (timeSpent || 0);
          attempt.answers[idx].answeredAt = new Date();
        } else {
          attempt.answers.push({ questionId, answer, isCorrect, points, timeSpent: timeSpent || 0, answeredAt: new Date() });
        }

        // Recalculate score
        attempt.score = attempt.answers.reduce((sum, a) => sum + (a.points || 0), 0);
        await attempt.save();

        // Ack back to student
        socket.emit('answer_saved', { attemptId, questionId, isCorrect, points, score: attempt.score });

        // Notify supervisors of progress
        this.io.to('role_admin').to('role_teacher').emit('student_progress', {
          userId,
          quizId: String(quiz._id),
          progress: { questionId, isCorrect },
          timestamp: new Date()
        });
      } catch (err) {
        console.error('save_answer error:', err);
      }
    });

    // Typing indicators for notifications
    socket.on('typing_notification', (data) => {
      socket.to('role_admin').to('role_teacher').emit('user_typing', {
        userId,
        isTyping: data.isTyping
      });
    });

    // Heartbeat to maintain connection
    socket.on('heartbeat', async () => {
      await User.findByIdAndUpdate(userId, {
        lastSeen: new Date()
      });
      socket.emit('heartbeat_ack');
    });
  }

  // Broadcast methods
  broadcastUserOnline(user) {
    this.io.emit('user_online', {
      _id: user._id,
      name: user.name,
      role: user.role,
      connectedAt: new Date()
    });
  }

  broadcastUserOffline(userId) {
    this.io.emit('user_offline', userId);
  }

  // Send notification to specific user
  sendToUser(userId, event, data) {
    this.io.to(`user_${userId}`).emit(event, data);
  }

  // Send to role-based groups
  sendToRole(role, event, data) {
    this.io.to(`role_${role}`).emit(event, data);
  }

  // Send to everyone
  broadcast(event, data) {
    this.io.emit(event, data);
  }

  // Send to quiz participants
  sendToQuiz(quizId, event, data) {
    this.io.to(`quiz_${quizId}`).emit(event, data);
  }

  // Notification-specific methods
  notifyUser(userId, notification) {
    this.sendToUser(userId, 'new_notification', notification);
  }

  notifyRole(role, notification) {
    this.sendToRole(role, 'new_notification', notification);
  }

  // Quiz-specific methods
  notifyQuizStart(quizId, data) {
    this.sendToQuiz(quizId, 'quiz_started', data);
  }

  notifyQuizEnd(quizId, data) {
    this.sendToQuiz(quizId, 'quiz_ended', data);
  }

  notifyQuizUpdate(quizId, data) {
    this.sendToQuiz(quizId, 'quiz_updated', data);
  }

  // Admin dashboard updates
  sendDashboardUpdate(data) {
    this.sendToRole('admin', 'dashboard_update', data);
  }

  // Get online users
  getOnlineUsers() {
    return Array.from(this.onlineUsers.values()).map(u => u.user);
  }

  // Get online count
  getOnlineCount() {
    return this.onlineUsers.size;
  }

  // Check if user is online
  isUserOnline(userId) {
    return this.onlineUsers.has(userId);
  }

  // Force disconnect user
  disconnectUser(userId) {
    const userSocket = this.onlineUsers.get(userId);
    if (userSocket) {
      const socket = this.io.sockets.sockets.get(userSocket.socketId);
      if (socket) {
        socket.disconnect(true);
      }
    }
  }

  // Send system announcement
  sendAnnouncement(message, type = 'info') {
    this.broadcast('system_announcement', {
      message,
      type,
      timestamp: new Date()
    });
  }
}

module.exports = new SocketService();
