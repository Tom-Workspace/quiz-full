const request = require('supertest');
const app = require('../server');
const User = require('../src/models/User');

describe('Authentication Endpoints', () => {
  beforeEach(async () => {
    // Clean up test data
    await User.deleteMany({});
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user successfully', async () => {
      const userData = {
        name: 'أحمد محمد',
        phone: '01234567890',
        age: 20,
        fatherPhone: '01234567891',
        password: 'password123'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('تم التسجيل بنجاح');
    });

    it('should reject registration with invalid phone number', async () => {
      const userData = {
        name: 'أحمد محمد',
        phone: '123456789', // Invalid phone
        age: 20,
        fatherPhone: '01234567891',
        password: 'password123'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should reject registration with duplicate phone number', async () => {
      const userData = {
        name: 'أحمد محمد',
        phone: '01234567890',
        age: 20,
        fatherPhone: '01234567891',
        password: 'password123'
      };

      // Register first user
      await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      // Try to register with same phone
      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('رقم الهاتف مستخدم بالفعل');
    });
  });

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      // Create a test user
      const user = new User({
        name: 'أحمد محمد',
        phone: '01234567890',
        age: 20,
        fatherPhone: '01234567891',
        password: 'password123',
        isApproved: true
      });
      await user.save();
    });

    it('should login successfully with correct credentials', async () => {
      const loginData = {
        phone: '01234567890',
        password: 'password123'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.accessToken).toBeDefined();
      expect(response.body.data.user.phone).toBe(loginData.phone);
    });

    it('should reject login with incorrect password', async () => {
      const loginData = {
        phone: '01234567890',
        password: 'wrongpassword'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should reject login for non-approved user', async () => {
      // Create non-approved user
      const user = new User({
        name: 'محمد أحمد',
        phone: '01234567892',
        age: 20,
        fatherPhone: '01234567893',
        password: 'password123',
        isApproved: false
      });
      await user.save();

      const loginData = {
        phone: '01234567892',
        password: 'password123'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('لم يتم الموافقة على حسابك');
    });
  });

  describe('GET /api/auth/profile', () => {
    let authToken;
    let userId;

    beforeEach(async () => {
      // Create and login user
      const user = new User({
        name: 'أحمد محمد',
        phone: '01234567890',
        age: 20,
        fatherPhone: '01234567891',
        password: 'password123',
        isApproved: true
      });
      await user.save();
      userId = user._id;

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          phone: '01234567890',
          password: 'password123'
        });

      authToken = loginResponse.body.data.accessToken;
    });

    it('should get user profile successfully', async () => {
      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.phone).toBe('01234567890');
      expect(response.body.data.user.password).toBeUndefined();
    });

    it('should reject request without token', async () => {
      const response = await request(app)
        .get('/api/auth/profile')
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });
});

