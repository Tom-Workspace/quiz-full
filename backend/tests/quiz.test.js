const request = require('supertest');
const app = require('../server');
const User = require('../src/models/User');
const Quiz = require('../src/models/Quiz');

describe('Quiz Endpoints', () => {
  let teacherToken;
  let studentToken;
  let teacherId;
  let studentId;

  beforeEach(async () => {
    // Clean up test data
    await User.deleteMany({});
    await Quiz.deleteMany({});

    // Create teacher user
    const teacher = new User({
      name: 'معلم الرياضيات',
      phone: '01111111111',
      age: 35,
      fatherPhone: '01111111112',
      password: 'password123',
      role: 'teacher',
      isApproved: true
    });
    await teacher.save();
    teacherId = teacher._id;

    // Create student user
    const student = new User({
      name: 'طالب مجتهد',
      phone: '01222222222',
      age: 18,
      fatherPhone: '01222222223',
      password: 'password123',
      role: 'student',
      isApproved: true
    });
    await student.save();
    studentId = student._id;

    // Login teacher
    const teacherLogin = await request(app)
      .post('/api/auth/login')
      .send({
        phone: '01111111111',
        password: 'password123'
      });
    teacherToken = teacherLogin.body.data.accessToken;

    // Login student
    const studentLogin = await request(app)
      .post('/api/auth/login')
      .send({
        phone: '01222222222',
        password: 'password123'
      });
    studentToken = studentLogin.body.data.accessToken;
  });

  describe('POST /api/quizzes', () => {
    it('should create a new quiz successfully (teacher)', async () => {
      const quizData = {
        title: 'اختبار الرياضيات الأول',
        description: 'اختبار في الجبر والهندسة',
        questions: [
          {
            questionText: 'ما هو ناتج 2 + 2؟',
            answerType: 'single-choice',
            options: [
              { text: '3', isCorrect: false },
              { text: '4', isCorrect: true },
              { text: '5', isCorrect: false }
            ],
            points: 10
          }
        ],
        settings: {
          duration: 30,
          maxAttempts: 3,
          startDate: new Date(),
          endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
          showAnswers: 'after-completion',
          showScore: 'immediately',
          allowResume: true
        }
      };

      const response = await request(app)
        .post('/api/quizzes')
        .set('Authorization', `Bearer ${teacherToken}`)
        .send(quizData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.quiz.title).toBe(quizData.title);
      expect(response.body.data.quiz.createdBy).toBe(teacherId.toString());
    });

    it('should reject quiz creation by student', async () => {
      const quizData = {
        title: 'اختبار غير مسموح',
        description: 'هذا الاختبار لا يجب أن يُنشأ',
        questions: [],
        settings: {
          duration: 30,
          maxAttempts: 1,
          startDate: new Date(),
          endDate: new Date(Date.now() + 24 * 60 * 60 * 1000)
        }
      };

      const response = await request(app)
        .post('/api/quizzes')
        .set('Authorization', `Bearer ${studentToken}`)
        .send(quizData)
        .expect(403);

      expect(response.body.success).toBe(false);
    });

    it('should reject quiz with invalid date range', async () => {
      const quizData = {
        title: 'اختبار بتواريخ خاطئة',
        description: 'تاريخ النهاية قبل تاريخ البداية',
        questions: [],
        settings: {
          duration: 30,
          maxAttempts: 1,
          startDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
          endDate: new Date() // End date before start date
        }
      };

      const response = await request(app)
        .post('/api/quizzes')
        .set('Authorization', `Bearer ${teacherToken}`)
        .send(quizData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('End date must be after start date');
    });
  });

  describe('GET /api/quizzes', () => {
    beforeEach(async () => {
      // Create test quizzes
      const quiz1 = new Quiz({
        title: 'اختبار الرياضيات',
        description: 'اختبار في الجبر',
        questions: [],
        createdBy: teacherId,
        isActive: true,
        settings: {
          duration: 30,
          maxAttempts: 3,
          startDate: new Date(Date.now() - 24 * 60 * 60 * 1000), // Started yesterday
          endDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Ends tomorrow
          showAnswers: 'after-completion',
          showScore: 'immediately'
        }
      });
      await quiz1.save();

      const quiz2 = new Quiz({
        title: 'اختبار العلوم',
        description: 'اختبار في الفيزياء',
        questions: [],
        createdBy: teacherId,
        isActive: false,
        settings: {
          duration: 45,
          maxAttempts: 2,
          startDate: new Date(),
          endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        }
      });
      await quiz2.save();
    });

    it('should get active quizzes for student', async () => {
      const response = await request(app)
        .get('/api/quizzes')
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.quizzes).toHaveLength(1); // Only active quiz
      expect(response.body.data.quizzes[0].title).toBe('اختبار الرياضيات');
    });

    it('should get all quizzes for teacher', async () => {
      const response = await request(app)
        .get('/api/quizzes')
        .set('Authorization', `Bearer ${teacherToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.quizzes).toHaveLength(2); // All quizzes created by teacher
    });

    it('should filter quizzes by search term', async () => {
      const response = await request(app)
        .get('/api/quizzes?search=رياضيات')
        .set('Authorization', `Bearer ${teacherToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.quizzes).toHaveLength(1);
      expect(response.body.data.quizzes[0].title).toContain('رياضيات');
    });
  });

  describe('GET /api/quizzes/:id', () => {
    let quizId;

    beforeEach(async () => {
      const quiz = new Quiz({
        title: 'اختبار تفصيلي',
        description: 'اختبار للحصول على التفاصيل',
        questions: [
          {
            questionText: 'سؤال تجريبي؟',
            answerType: 'single-choice',
            options: [
              { text: 'إجابة 1', isCorrect: false },
              { text: 'إجابة 2', isCorrect: true }
            ],
            correctAnswer: 'إجابة 2',
            points: 5
          }
        ],
        createdBy: teacherId,
        isActive: true,
        settings: {
          duration: 30,
          maxAttempts: 3,
          startDate: new Date(Date.now() - 24 * 60 * 60 * 1000),
          endDate: new Date(Date.now() + 24 * 60 * 60 * 1000)
        }
      });
      await quiz.save();
      quizId = quiz._id;
    });

    it('should get quiz details for teacher (with answers)', async () => {
      const response = await request(app)
        .get(`/api/quizzes/${quizId}`)
        .set('Authorization', `Bearer ${teacherToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.quiz.questions[0].correctAnswer).toBeDefined();
    });

    it('should get quiz details for student (without answers)', async () => {
      const response = await request(app)
        .get(`/api/quizzes/${quizId}`)
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.quiz.questions[0].correctAnswer).toBeUndefined();
      expect(response.body.data.quiz.questions[0].options).toHaveLength(2);
      expect(response.body.data.quiz.questions[0].options[0].isCorrect).toBeUndefined();
    });

    it('should return 404 for non-existent quiz', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      const response = await request(app)
        .get(`/api/quizzes/${fakeId}`)
        .set('Authorization', `Bearer ${teacherToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });
});

