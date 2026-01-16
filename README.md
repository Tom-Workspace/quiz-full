# منصة الكويزات التعليمية

منصة شاملة لإدارة الكويزات والاختبارات التعليمية مع دعم الوقت الفعلي ونظام إدارة المستخدمين المتقدم.

## المميزات

### للطلاب
- تسجيل حساب جديد مع انتظار موافقة المعلم
- تصفح الكويزات المتاحة وحل الاختبارات
- عرض النتائج والدرجات
- متابعة التقدم الشخصي

### للمعلمين
- إنشاء وإدارة الكويزات
- مراقبة تقدم الطلاب في الوقت الفعلي
- عرض الإحصائيات والتقارير
- الموافقة على تسجيل الطلاب الجدد

### للمسؤولين
- إدارة جميع المستخدمين والصلاحيات
- مراقبة النظام والإحصائيات العامة
- إدارة إعدادات المنصة

## التقنيات المستخدمة

### الواجهة الخلفية (Backend)
- **Node.js** مع **Express.js**
- **MongoDB** لقاعدة البيانات
- **Redis** للتخزين المؤقت
- **Socket.IO** للاتصال في الوقت الفعلي
- **JWT** للمصادقة والتفويض
- **Helmet** و **Rate Limiting** للأمان

### الواجهة الأمامية (Frontend)
- **Next.js 14** مع **TypeScript**
- **Tailwind CSS** للتصميم
- **Socket.IO Client** للاتصال في الوقت الفعلي
- **Axios** لطلبات API

### النشر والتشغيل
- **Docker** و **Docker Compose**
- **Nginx** كخادم وكيل عكسي
- دعم **HTTPS** و **SSL**

## متطلبات النظام

- Node.js 18+
- Docker و Docker Compose
- MongoDB 7.0+
- Redis 7.2+

## التثبيت والتشغيل

### 1. استنساخ المشروع
```bash
git clone <repository-url>
cd quiz-platform
```

### 2. إعداد متغيرات البيئة
```bash
cp .env.example .env
# قم بتعديل الملف .env حسب احتياجاتك
```

### 3. التشغيل باستخدام Docker
```bash
# تشغيل جميع الخدمات
docker-compose up -d

# عرض السجلات
docker-compose logs -f

# إيقاف الخدمات
docker-compose down
```

### 4. التشغيل في بيئة التطوير

#### الواجهة الخلفية
```bash
cd backend
npm install
cp .env.example .env
npm run dev
```

#### الواجهة الأمامية
```bash
cd frontend
npm install
cp .env.example .env.local
npm run dev
```

## الاستخدام

### الوصول للمنصة
- الواجهة الأمامية: http://localhost:3000
- API الخلفية: http://localhost:5000
- قاعدة البيانات: mongodb://localhost:27017
- Redis: redis://localhost:6379

### حساب المسؤول الافتراضي
- رقم الهاتف: `01000000000`
- كلمة المرور: `password`

## هيكل المشروع

```
quiz-platform/
├── backend/                 # الواجهة الخلفية
│   ├── src/
│   │   ├── config/         # ملفات التكوين
│   │   ├── controllers/    # وحدات التحكم
│   │   ├── models/         # نماذج قاعدة البيانات
│   │   ├── routes/         # مسارات API
│   │   ├── middlewares/    # الوسطيات
│   │   ├── utils/          # وظائف مساعدة
│   │   └── services/       # الخدمات
│   ├── Dockerfile
│   └── package.json
├── frontend/               # الواجهة الأمامية
│   ├── src/
│   │   ├── app/           # صفحات Next.js
│   │   ├── components/    # مكونات React
│   │   ├── contexts/      # React Contexts
│   │   └── lib/          # مكتبات ووظائف مساعدة
│   ├── Dockerfile
│   └── package.json
├── docker-compose.yml      # تكوين Docker Compose
├── nginx.conf             # تكوين Nginx
└── README.md
```

## API Documentation

### المصادقة
- `POST /api/auth/register` - تسجيل مستخدم جديد
- `POST /api/auth/login` - تسجيل الدخول
- `POST /api/auth/logout` - تسجيل الخروج
- `GET /api/auth/profile` - الحصول على الملف الشخصي
- `PUT /api/auth/profile` - تحديث الملف الشخصي

### المستخدمين
- `GET /api/users` - قائمة المستخدمين
- `GET /api/users/pending` - المستخدمين في انتظار الموافقة
- `PUT /api/users/:id/approval` - الموافقة على مستخدم
- `PUT /api/users/:id/role` - تغيير دور المستخدم
- `DELETE /api/users/:id` - حذف مستخدم

### الكويزات
- `GET /api/quizzes` - قائمة الكويزات
- `GET /api/quizzes/:id` - تفاصيل كويز
- `POST /api/quizzes` - إنشاء كويز جديد
- `PUT /api/quizzes/:id` - تحديث كويز
- `DELETE /api/quizzes/:id` - حذف كويز
- `GET /api/quizzes/:id/stats` - إحصائيات الكويز

### محاولات الكويز
- `POST /api/attempts/start` - بدء كويز
- `POST /api/attempts/:id/answer` - إرسال إجابة
- `POST /api/attempts/:id/complete` - إنهاء الكويز
- `GET /api/attempts/my-attempts` - محاولاتي
- `GET /api/attempts/quiz/:id` - محاولات كويز معين

## الأمان

- تشفير كلمات المرور باستخدام bcrypt
- JWT للمصادقة مع Refresh Tokens
- Rate Limiting لمنع الهجمات
- CORS وCSRF Protection
- تنظيف وتحقق من البيانات المدخلة
- Headers أمان إضافية

## المساهمة

1. Fork المشروع
2. إنشاء فرع للميزة الجديدة (`git checkout -b feature/AmazingFeature`)
3. Commit التغييرات (`git commit -m 'Add some AmazingFeature'`)
4. Push للفرع (`git push origin feature/AmazingFeature`)
5. فتح Pull Request

## الترخيص

هذا المشروع مرخص تحت رخصة MIT - انظر ملف [LICENSE](LICENSE) للتفاصيل.

## الدعم

للحصول على الدعم، يرجى فتح issue في GitHub أو التواصل مع فريق التطوير.

## التحديثات المستقبلية

- [ ] دعم الملفات المرفقة في الأسئلة
- [ ] نظام الإشعارات المتقدم
- [ ] تقارير مفصلة وتحليلات
- [ ] دعم اللغات المتعددة
- [ ] تطبيق الهاتف المحمول
- [ ] دمج مع أنظمة إدارة التعلم الأخرى

