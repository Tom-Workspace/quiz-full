// MongoDB initialization script
db = db.getSiblingDB('quiz_platform');

// Create collections
db.createCollection('users');
db.createCollection('quizzes');
db.createCollection('quizattempts');

// Create indexes for better performance
db.users.createIndex({ "phone": 1 }, { unique: true });
db.users.createIndex({ "role": 1 });
db.users.createIndex({ "isApproved": 1 });
db.users.createIndex({ "isOnline": 1 });

db.quizzes.createIndex({ "createdBy": 1 });
db.quizzes.createIndex({ "isActive": 1 });
db.quizzes.createIndex({ "settings.startDate": 1 });
db.quizzes.createIndex({ "settings.endDate": 1 });

db.quizattempts.createIndex({ "quiz": 1 });
db.quizattempts.createIndex({ "student": 1 });
db.quizattempts.createIndex({ "status": 1 });
db.quizattempts.createIndex({ "createdAt": 1 });

// Create default admin user
db.users.insertOne({
  name: "Ahmed",
  phone: "01157877958",
  age: 30,
  fatherPhone: "01212443156",
  password: "$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi", // password: password
  role: "admin",
  isApproved: true,
  isOnline: false,
  createdAt: new Date(),
  updatedAt: new Date()
});

// db.users.insertOne({
//   name: "teaccher",
//   phone: "01212443156",
//   age: 30,
//   fatherPhone: "01212443151",
//   password: "$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi", // password: password
//   role: "student",
//   isApproved: true,
//   isOnline: false,
//   createdAt: new Date(),
//   updatedAt: new Date()
// });


print('Database initialized successfully!');

