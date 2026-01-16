'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { 
  Settings, 
  Shield, 
  Bell, 
  Database, 
  Globe, 
  Mail, 
  Key, 
  Zap, 
  Save,
  RefreshCw,
  Download,
  Upload,
  Users,
  Clock,
  AlertTriangle,
  CheckCircle,
  Info,
  Server,
  HardDrive,
  Wifi,
  Eye,
  EyeOff
} from 'lucide-react';
import { settingsAPI } from '@/lib/api';

interface SystemSettings {
  siteName: string;
  siteDescription: string;
  maintenanceMode: boolean;
  registrationEnabled: boolean;
  maxUsersPerQuiz: number;
  defaultQuizDuration: number;
  autoApproveTeachers: boolean;
  emailNotifications: boolean;
  smsNotifications: boolean;
  backupFrequency: 'daily' | 'weekly' | 'monthly';
  sessionTimeout: number;
  maxLoginAttempts: number;
  passwordMinLength: number;
  requirePasswordSpecialChars: boolean;
  enableTwoFactor: boolean;
}

const AdminSettingsPage: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [showPasswords, setShowPasswords] = useState(false);
  const [activeTab, setActiveTab] = useState<'general' | 'security' | 'notifications' | 'backup'>('general');
  
  const [settings, setSettings] = useState<SystemSettings>({
    siteName: 'منصة الاختبارات الذكية',
    siteDescription: 'منصة تعليمية لإجراء الاختبارات والكويزات التفاعلية',
    maintenanceMode: false,
    registrationEnabled: true,
    maxUsersPerQuiz: 100,
    defaultQuizDuration: 60,
    autoApproveTeachers: false,
    emailNotifications: true,
    smsNotifications: false,
    backupFrequency: 'daily',
    sessionTimeout: 30,
    maxLoginAttempts: 5,
    passwordMinLength: 8,
    requirePasswordSpecialChars: true,
    enableTwoFactor: false
  });

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const res = await settingsAPI.get();
        const data = res.data.data;
        setSettings(prev => ({ ...prev, ...data }));
      } catch (e) {
        showNotification('تعذر تحميل إعدادات النظام', 'error');
      } finally {
        setLoading(false);
      }
    };
    if (user?.role === 'admin') load();
  }, [user]);

  const handleSave = async () => {
    setLoading(true);
    try {
      await settingsAPI.update(settings as any);
      showNotification('تم حفظ الإعدادات بنجاح', 'success');
    } catch (error) {
      showNotification('خطأ في حفظ الإعدادات', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleBackup = async () => {
    setLoading(true);
    try {
      // Here you would call the backup API
      // await backupAPI.create();
      showNotification('تم إنشاء نسخة احتياطية بنجاح', 'success');
    } catch (error) {
      showNotification('خطأ في إنشاء النسخة الاحتياطية', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showNotification = (message: string, type: 'success' | 'error') => {
    const div = document.createElement('div');
    div.className = `fixed top-4 right-4 px-4 py-3 rounded-lg z-50 ${
      type === 'success' ? 'bg-green-100 border border-green-200 text-green-700' 
      : 'bg-red-100 border border-red-200 text-red-700'
    }`;
    div.textContent = message;
    document.body.appendChild(div);
    setTimeout(() => document.body.removeChild(div), 3000);
  };

  if (!user || user.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">غير مصرح لك بالوصول</h1>
          <p className="text-gray-600 dark:text-gray-300">هذه الصفحة مخصصة للمسؤولين فقط</p>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'general', name: 'إعدادات عامة', icon: Settings },
    { id: 'security', name: 'الأمان', icon: Shield },
    { id: 'notifications', name: 'الإشعارات', icon: Bell },
    { id: 'backup', name: 'النسخ الاحتياطي', icon: Database }
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">إعدادات النظام</h1>
            <Button onClick={handleSave} loading={loading}>
              <Save className="h-4 w-4 mr-2" />
              حفظ الإعدادات
            </Button>
          </div>

          {/* System Status Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card className="hover:shadow-lg transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center">
                  <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                    <Server className="h-5 w-5 text-green-600 dark:text-green-300" />
                  </div>
                  <div className="mr-3">
                    <p className="text-sm text-gray-600 dark:text-gray-300">حالة الخادم</p>
                    <p className="text-lg font-bold text-green-600 dark:text-green-400">متصل</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                    <HardDrive className="h-5 w-5 text-blue-600 dark:text-blue-300" />
                  </div>
                  <div className="mr-3">
                    <p className="text-sm text-gray-600 dark:text-gray-300">مساحة التخزين</p>
                    <p className="text-lg font-bold text-gray-900 dark:text-white">78% مستخدم</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center">
                  <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                    <Users className="h-5 w-5 text-purple-600 dark:text-purple-300" />
                  </div>
                  <div className="mr-3">
                    <p className="text-sm text-gray-600 dark:text-gray-300">المستخدمين المتصلين</p>
                    <p className="text-lg font-bold text-gray-900 dark:text-white">142</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center">
                  <div className="p-2 bg-yellow-100 dark:bg-yellow-900 rounded-lg">
                    <Wifi className="h-5 w-5 text-yellow-600 dark:text-yellow-300" />
                  </div>
                  <div className="mr-3">
                    <p className="text-sm text-gray-600 dark:text-gray-300">آخر نسخة احتياطية</p>
                    <p className="text-lg font-bold text-gray-900 dark:text-white">قبل 2 ساعة</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sidebar Tabs */}
          <div className="lg:w-1/4">
            <Card>
              <CardContent className="p-4">
                <nav className="space-y-2">
                  {tabs.map((tab) => {
                    const Icon = tab.icon;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`w-full flex items-center p-3 text-right rounded-lg transition-colors ${
                          activeTab === tab.id
                            ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                        }`}
                      >
                        <Icon className="h-5 w-5 ml-3" />
                        {tab.name}
                      </button>
                    );
                  })}
                </nav>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="lg:w-3/4">
            {activeTab === 'general' && (
              <Card>
                <CardHeader>
                  <CardTitle>الإعدادات العامة</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">اسم الموقع</label>
                      <Input
                        value={settings.siteName}
                        onChange={(e) => setSettings({...settings, siteName: e.target.value})}
                        placeholder="اسم المنصة"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">أقصى عدد مستخدمين لكل كويز</label>
                      <Input
                        type="number"
                        value={settings.maxUsersPerQuiz}
                        onChange={(e) => setSettings({...settings, maxUsersPerQuiz: parseInt(e.target.value)})}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">وصف الموقع</label>
                    <textarea
                      value={settings.siteDescription}
                      onChange={(e) => setSettings({...settings, siteDescription: e.target.value})}
                      className="w-full p-2 border rounded-md h-24 dark:bg-gray-800 dark:border-gray-600"
                      placeholder="وصف المنصة"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">مدة الكويز الافتراضية (دقيقة)</label>
                      <Input
                        type="number"
                        value={settings.defaultQuizDuration}
                        onChange={(e) => setSettings({...settings, defaultQuizDuration: parseInt(e.target.value)})}
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-medium">وضع الصيانة</h3>
                        <p className="text-xs text-gray-600 dark:text-gray-400">إيقاف الموقع مؤقتاً للصيانة</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={settings.maintenanceMode}
                        onChange={(e) => setSettings({...settings, maintenanceMode: e.target.checked})}
                        className="toggle"
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-medium">السماح بالتسجيل</h3>
                        <p className="text-xs text-gray-600 dark:text-gray-400">السماح للمستخدمين الجدد بإنشاء حسابات</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={settings.registrationEnabled}
                        onChange={(e) => setSettings({...settings, registrationEnabled: e.target.checked})}
                        className="toggle"
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-medium">موافقة تلقائية للمعلمين</h3>
                        <p className="text-xs text-gray-600 dark:text-gray-400">الموافقة تلقائياً على طلبات المعلمين</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={settings.autoApproveTeachers}
                        onChange={(e) => setSettings({...settings, autoApproveTeachers: e.target.checked})}
                        className="toggle"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {activeTab === 'security' && (
              <Card>
                <CardHeader>
                  <CardTitle>إعدادات الأمان</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">مهلة انتهاء الجلسة (دقيقة)</label>
                      <Input
                        type="number"
                        value={settings.sessionTimeout}
                        onChange={(e) => setSettings({...settings, sessionTimeout: parseInt(e.target.value)})}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">أقصى عدد محاولات تسجيل دخول</label>
                      <Input
                        type="number"
                        value={settings.maxLoginAttempts}
                        onChange={(e) => setSettings({...settings, maxLoginAttempts: parseInt(e.target.value)})}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">الحد الأدنى لطول كلمة المرور</label>
                      <Input
                        type="number"
                        value={settings.passwordMinLength}
                        onChange={(e) => setSettings({...settings, passwordMinLength: parseInt(e.target.value)})}
                        min="6"
                        max="20"
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-medium">اشتراط رموز خاصة في كلمة المرور</h3>
                        <p className="text-xs text-gray-600 dark:text-gray-400">اشتراط استخدام رموز خاصة (!@#$%^&*)</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={settings.requirePasswordSpecialChars}
                        onChange={(e) => setSettings({...settings, requirePasswordSpecialChars: e.target.checked})}
                        className="toggle"
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-medium">تفعيل المصادقة الثنائية</h3>
                        <p className="text-xs text-gray-600 dark:text-gray-400">تطلب رمز إضافي عند تسجيل الدخول</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={settings.enableTwoFactor}
                        onChange={(e) => setSettings({...settings, enableTwoFactor: e.target.checked})}
                        className="toggle"
                      />
                    </div>
                  </div>

                  <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                    <div className="flex items-center">
                      <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mr-2" />
                      <div>
                        <h4 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">تحذير أمني</h4>
                        <p className="text-xs text-yellow-700 dark:text-yellow-300">تأكد من تطبيق إعدادات أمان قوية لحماية المنصة</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {activeTab === 'notifications' && (
              <Card>
                <CardHeader>
                  <CardTitle>إعدادات الإشعارات</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-medium">إشعارات البريد الإلكتروني</h3>
                        <p className="text-xs text-gray-600 dark:text-gray-400">إرسال إشعارات عبر البريد الإلكتروني</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={settings.emailNotifications}
                        onChange={(e) => setSettings({...settings, emailNotifications: e.target.checked})}
                        className="toggle"
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-medium">إشعارات الرسائل النصية</h3>
                        <p className="text-xs text-gray-600 dark:text-gray-400">إرسال إشعارات عبر الرسائل النصية</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={settings.smsNotifications}
                        onChange={(e) => setSettings({...settings, smsNotifications: e.target.checked})}
                        className="toggle"
                      />
                    </div>
                  </div>

                  <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                    <div className="flex items-center">
                      <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 mr-2" />
                      <div>
                        <h4 className="text-sm font-medium text-blue-800 dark:text-blue-200">معلومة</h4>
                        <p className="text-xs text-blue-700 dark:text-blue-300">يمكن للمستخدمين تخصيص تفضيلات الإشعارات الخاصة بهم من صفحة الملف الشخصي</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {activeTab === 'backup' && (
              <Card>
                <CardHeader>
                  <CardTitle>النسخ الاحتياطي</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium mb-1">تكرار النسخ الاحتياطي</label>
                    <select
                      value={settings.backupFrequency}
                      onChange={(e) => setSettings({...settings, backupFrequency: e.target.value as any})}
                      className="w-full p-2 border rounded-md dark:bg-gray-800 dark:border-gray-600"
                    >
                      <option value="daily">يومياً</option>
                      <option value="weekly">أسبوعياً</option>
                      <option value="monthly">شهرياً</option>
                    </select>
                  </div>

                  <div className="flex gap-3">
                    <Button onClick={handleBackup} loading={loading}>
                      <Download className="h-4 w-4 mr-2" />
                      إنشاء نسخة احتياطية الآن
                    </Button>
                    <Button variant="outline">
                      <Upload className="h-4 w-4 mr-2" />
                      استعادة من نسخة احتياطية
                    </Button>
                  </div>

                  <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                    <div className="flex items-center">
                      <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 mr-2" />
                      <div>
                        <h4 className="text-sm font-medium text-green-800 dark:text-green-200">آخر نسخة احتياطية</h4>
                        <p className="text-xs text-green-700 dark:text-green-300">تمت بنجاح في 15 يناير 2024 الساعة 03:00 ص</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminSettingsPage;
