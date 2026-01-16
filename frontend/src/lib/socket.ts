import { io, Socket } from 'socket.io-client';

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5000';

class SocketService {
  private socket: Socket | null = null;
  private token: string | null = null;

  connect(token: string) {
    if (this.socket?.connected) {
      return this.socket;
    }

    this.token = token;
    this.socket = io(SOCKET_URL, {
      auth: {
        token,
      },
      transports: ['websocket', 'polling'],
    });

    this.setupEventListeners();
    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  private setupEventListeners() {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('Connected to server');
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from server');
    });

    this.socket.on('connect_error', (error) => {
      console.error('Connection error:', error);
    });
  }

  // Quiz rooms
  joinQuiz(quizId: string) {
    this.socket?.emit('join_quiz', quizId);
  }

  leaveQuiz(quizId: string) {
    this.socket?.emit('leave_quiz', quizId);
  }

  // Backward compatibility wrappers (deprecated)
  joinQuizAttempt(id: string) {
    // previously used attempt rooms; map to quiz join to keep functionality
    this.joinQuiz(id);
  }
  leaveQuizAttempt(id: string) {
    this.leaveQuiz(id);
  }

  // Progress events
  sendQuizProgress(data: { quizId: string; progress: any }) {
    this.socket?.emit('quiz_progress', data);
  }

  // Autosave answers
  saveAnswer(payload: { attemptId: string; questionId: string; answer: any; timeSpent?: number }) {
    this.socket?.emit('save_answer', payload);
  }

  // Listeners
  onStudentProgress(callback: (data: any) => void) {
    // Backend emits 'student_progress'
    this.socket?.on('student_progress', callback);
  }

  onOnlineUsers(callback: (users: any[]) => void) {
    this.socket?.on('online_users', callback);
  }

  onUserOnline(callback: (data: any) => void) {
    this.socket?.on('user_online', callback);
  }

  onUserOffline(callback: (data: any) => void) {
    this.socket?.on('user_offline', callback);
  }

  onNewUserRegistration(callback: (data: any) => void) {
    this.socket?.on('user_registered', callback);
  }

  on(event: string, callback: any) {
    this.socket?.on(event, callback);
  }

  off(event: string, callback?: any) {
    this.socket?.off(event, callback);
  }

  // Get socket instance
  getSocket() {
    return this.socket;
  }

  isConnected() {
    return this.socket?.connected || false;
  }
}

const socketService = new SocketService();
export default socketService;
