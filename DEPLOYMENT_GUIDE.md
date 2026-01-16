# دليل نشر منصة الكويزات التعليمية

هذا الدليل يوضح كيفية نشر منصة الكويزات التعليمية في بيئات مختلفة.

## المتطلبات الأساسية

### الأجهزة المطلوبة
- **المعالج**: 2 CPU cores أو أكثر
- **الذاكرة**: 4GB RAM كحد أدنى، 8GB مُوصى به
- **التخزين**: 20GB مساحة فارغة كحد أدنى
- **الشبكة**: اتصال إنترنت مستقر

### البرامج المطلوبة
- Docker 20.10+
- Docker Compose 2.0+
- Git
- (اختياري) Node.js 18+ للتطوير المحلي

## طرق النشر

### 1. النشر باستخدام Docker Compose (الطريقة المُوصى بها)

#### الخطوة 1: تحضير الخادم
```bash
# تحديث النظام
sudo apt update && sudo apt upgrade -y

# تثبيت Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# تثبيت Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# إضافة المستخدم لمجموعة Docker
sudo usermod -aG docker $USER
```

#### الخطوة 2: تحضير المشروع
```bash
# استنساخ المشروع
git clone <repository-url>
cd quiz-platform

# إعداد متغيرات البيئة
cp .env.example .env
nano .env  # تعديل القيم حسب البيئة
```

#### الخطوة 3: تكوين متغيرات البيئة
```bash
# .env
MONGO_ROOT_USERNAME=admin
MONGO_ROOT_PASSWORD=your-secure-password
MONGO_DB_NAME=quiz_platform

REDIS_PASSWORD=your-redis-password

JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters
JWT_REFRESH_SECRET=your-super-secret-refresh-key-minimum-32-characters

FRONTEND_URL=https://yourdomain.com
BACKEND_URL=https://api.yourdomain.com
```

#### الخطوة 4: تشغيل المنصة
```bash
# تشغيل جميع الخدمات
docker-compose up -d

# التحقق من حالة الخدمات
docker-compose ps

# عرض السجلات
docker-compose logs -f
```

#### الخطوة 5: التحقق من التشغيل
```bash
# التحقق من صحة الخدمات
curl http://localhost:5000/health
curl http://localhost:3000

# الدخول للمنصة
# المتصفح: http://localhost:3000
# حساب المسؤول الافتراضي:
# الهاتف: 01000000000
# كلمة المرور: password
```

### 2. النشر على خادم سحابي (AWS/DigitalOcean/VPS)

#### إعداد Nginx مع SSL
```bash
# تثبيت Nginx
sudo apt install nginx certbot python3-certbot-nginx -y

# إعداد ملف التكوين
sudo nano /etc/nginx/sites-available/quiz-platform
```

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
    
    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    location /socket.io {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
# تفعيل الموقع
sudo ln -s /etc/nginx/sites-available/quiz-platform /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# الحصول على شهادة SSL
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

#### إعداد Firewall
```bash
# تكوين UFW
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

### 3. النشر على Kubernetes

#### ملف التكوين الأساسي
```yaml
# k8s-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: quiz-platform-backend
spec:
  replicas: 2
  selector:
    matchLabels:
      app: quiz-platform-backend
  template:
    metadata:
      labels:
        app: quiz-platform-backend
    spec:
      containers:
      - name: backend
        image: quiz-platform/backend:latest
        ports:
        - containerPort: 5000
        env:
        - name: MONGODB_URI
          valueFrom:
            secretKeyRef:
              name: quiz-secrets
              key: mongodb-uri
        - name: REDIS_URL
          valueFrom:
            secretKeyRef:
              name: quiz-secrets
              key: redis-url
---
apiVersion: v1
kind: Service
metadata:
  name: quiz-platform-backend-service
spec:
  selector:
    app: quiz-platform-backend
  ports:
  - port: 5000
    targetPort: 5000
  type: ClusterIP
```

## المراقبة والصيانة

### مراقبة الخدمات
```bash
# مراقبة استخدام الموارد
docker stats

# مراقبة السجلات
docker-compose logs -f backend
docker-compose logs -f frontend

# التحقق من صحة قاعدة البيانات
docker-compose exec mongodb mongo --eval "db.adminCommand('ismaster')"
```

### النسخ الاحتياطي
```bash
# نسخ احتياطي لقاعدة البيانات
docker-compose exec mongodb mongodump --out /backup --db quiz_platform

# نسخ احتياطي للملفات المرفوعة
docker-compose exec backend tar -czf /backup/uploads.tar.gz /app/uploads
```

### التحديث
```bash
# سحب آخر التحديثات
git pull origin main

# إعادة بناء وتشغيل الخدمات
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

## استكشاف الأخطاء

### مشاكل شائعة وحلولها

#### 1. فشل الاتصال بقاعدة البيانات
```bash
# التحقق من حالة MongoDB
docker-compose logs mongodb

# إعادة تشغيل قاعدة البيانات
docker-compose restart mongodb
```

#### 2. مشاكل الذاكرة
```bash
# زيادة حد الذاكرة في docker-compose.yml
services:
  backend:
    deploy:
      resources:
        limits:
          memory: 1G
        reservations:
          memory: 512M
```

#### 3. مشاكل الشبكة
```bash
# التحقق من الشبكات
docker network ls
docker network inspect quiz-platform_quiz-network

# إعادة إنشاء الشبكة
docker-compose down
docker-compose up -d
```

## الأمان في الإنتاج

### 1. تأمين قاعدة البيانات
- استخدام كلمات مرور قوية
- تقييد الوصول للشبكة المحلية فقط
- تفعيل المصادقة والتشفير

### 2. تأمين Redis
- استخدام كلمة مرور قوية
- تقييد الوصول للشبكة المحلية
- تفعيل TLS إذا أمكن

### 3. تأمين التطبيق
- استخدام HTTPS فقط
- تحديث الحاويات بانتظام
- مراقبة السجلات للأنشطة المشبوهة

### 4. النسخ الاحتياطي المنتظم
```bash
# إعداد cron job للنسخ الاحتياطي اليومي
0 2 * * * /path/to/backup-script.sh
```

## الدعم والمساعدة

للحصول على المساعدة:
1. راجع ملف README.md
2. تحقق من السجلات باستخدام `docker-compose logs`
3. افتح issue في GitHub
4. تواصل مع فريق التطوير

## قائمة التحقق للنشر

- [ ] تم تثبيت Docker و Docker Compose
- [ ] تم إعداد متغيرات البيئة بشكل صحيح
- [ ] تم تكوين Nginx و SSL
- [ ] تم إعداد Firewall
- [ ] تم اختبار جميع الوظائف
- [ ] تم إعداد النسخ الاحتياطي
- [ ] تم إعداد المراقبة
- [ ] تم توثيق كلمات المرور والمفاتيح بأمان

