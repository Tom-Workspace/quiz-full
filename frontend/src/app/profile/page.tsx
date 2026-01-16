'use client';

import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { authAPI } from '@/lib/api';
import { validatePhone, validatePassword } from '@/lib/utils';
import { User, Phone, Lock, Save, Edit3, Check, X } from 'lucide-react';

interface ProfileData {
  name: string;
  phone: string;
  age: number;
  fatherPhone: string;
}

interface PasswordData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

const ProfilePage: React.FC = () => {
  const { user, updateUser } = useAuth();
  const [editing, setEditing] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  
  const [profileData, setProfileData] = useState<ProfileData>({
    name: user?.name || '',
    phone: user?.phone || '',
    age: user?.age || 0,
    fatherPhone: user?.fatherPhone || '',
  });
  
  const [passwordData, setPasswordData] = useState<PasswordData>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [passwordErrors, setPasswordErrors] = useState<Record<string, string>>({});

  const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setProfileData(prev => ({ ...prev, [name]: name === 'age' ? parseInt(value) || 0 : value }));
    
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({ ...prev, [name]: value }));
    
    if (passwordErrors[name]) {
      setPasswordErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateProfile = () => {
    const newErrors: Record<string, string> = {};

    if (!profileData.name.trim()) {
      newErrors.name = 'الاسم مطلوب';
    } else if (profileData.name.trim().length < 2) {
      newErrors.name = 'الاسم يجب أن يكون على الأقل حرفين';
    }

    if (!profileData.phone) {
      newErrors.phone = 'رقم الهاتف مطلوب';
    } else if (!validatePhone(profileData.phone)) {
      newErrors.phone = 'رقم الهاتف غير صحيح';
    }

    if (!profileData.age || profileData.age < 5 || profileData.age > 100) {
      newErrors.age = 'العمر يجب أن يكون بين 5 و 100 سنة';
    }

    if (!profileData.fatherPhone) {
      newErrors.fatherPhone = 'رقم هاتف ولي الأمر مطلوب';
    } else if (!validatePhone(profileData.fatherPhone)) {
      newErrors.fatherPhone = 'رقم هاتف ولي الأمر غير صحيح';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validatePasswordForm = () => {
    const newErrors: Record<string, string> = {};

    if (!passwordData.currentPassword) {
      newErrors.currentPassword = 'كلمة المرور الحالية مطلوبة';
    }

    if (!passwordData.newPassword) {
      newErrors.newPassword = 'كلمة المرور الجديدة مطلوبة';
    } else if (!validatePassword(passwordData.newPassword)) {
      newErrors.newPassword = 'كلمة المرور يجب أن تكون على الأقل 6 أحرف';
    }

    if (!passwordData.confirmPassword) {
      newErrors.confirmPassword = 'تأكيد كلمة المرور مطلوب';
    } else if (passwordData.newPassword !== passwordData.confirmPassword) {
      newErrors.confirmPassword = 'كلمة المرور غير متطابقة';
    }

    setPasswordErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSaveProfile = async () => {
    if (!validateProfile()) return;

    setLoading(true);
    try {
      const updateData = {
        name: profileData.name.trim(),
        phone: profileData.phone,
        age: profileData.age,
        fatherPhone: profileData.fatherPhone,
      };

      await authAPI.updateProfile(updateData);
      updateUser(updateData);
      setEditing(false);
      
      // Show success message
      const successDiv = document.createElement('div');
      successDiv.className = 'fixed top-4 right-4 bg-green-100 border border-green-200 text-green-700 px-4 py-3 rounded-lg z-50';
      successDiv.textContent = 'تم حفظ التغييرات بنجاح!';
      document.body.appendChild(successDiv);
      
      setTimeout(() => {
        document.body.removeChild(successDiv);
      }, 3000);
      
    } catch (error: any) {
      setErrors({ general: error.response?.data?.message || 'حدث خطأ في حفظ البيانات' });
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (!validatePasswordForm()) return;

    setPasswordLoading(true);
    try {
      await authAPI.updateProfile({
        currentPassword: passwordData.currentPassword,
        password: passwordData.newPassword,
      });

      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
      setChangingPassword(false);
      
      // Show success message
      const successDiv = document.createElement('div');
      successDiv.className = 'fixed top-4 right-4 bg-green-100 border border-green-200 text-green-700 px-4 py-3 rounded-lg z-50';
      successDiv.textContent = 'تم تغيير كلمة المرور بنجاح!';
      document.body.appendChild(successDiv);
      
      setTimeout(() => {
        document.body.removeChild(successDiv);
      }, 3000);
      
    } catch (error: any) {
      setPasswordErrors({ general: error.response?.data?.message || 'حدث خطأ في تغيير كلمة المرور' });
    } finally {
      setPasswordLoading(false);
    }
  };

  const cancelEditing = () => {
    setProfileData({
      name: user?.name || '',
      phone: user?.phone || '',
      age: user?.age || 0,
      fatherPhone: user?.fatherPhone || '',
    });
    setEditing(false);
    setErrors({});
  };

  const cancelPasswordChange = () => {
    setPasswordData({
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    });
    setChangingPassword(false);
    setPasswordErrors({});
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin': return 'مسؤول';
      case 'teacher': return 'معلم';
      case 'student': return 'طالب';
      default: return role;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-red-100 text-red-800';
      case 'teacher': return 'bg-blue-100 text-blue-800';
      case 'student': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">الملف الشخصي</h1>
          <p className="text-gray-600">إدارة معلوماتك الشخصية وإعدادات الحساب</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Profile Summary */}
          <div className="lg:col-span-1">
            <Card>
              <CardContent className="p-6 text-center">
                <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <User className="h-10 w-10 text-blue-600" />
                </div>
                <h2 className="text-xl font-semibold text-gray-900 mb-2">{user.name}</h2>
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getRoleColor(user.role)}`}>
                  {getRoleLabel(user.role)}
                </span>
                <div className="mt-4 space-y-3 text-sm text-gray-600">
                  <div className="flex items-center justify-center gap-2">
                    <Phone className="h-4 w-4" />
                    <span>{user.phone}</span>
                  </div>
                  <div className="text-center">
                    <span>العضوية منذ: {new Date(user.createdAt).toLocaleDateString('ar-EG')}</span>
                  </div>
                  {user.approvedAt && (
                    <div className="text-center">
                      <span className="text-green-600">تم التفعيل: {new Date(user.approvedAt).toLocaleDateString('ar-EG')}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Profile Details */}
          <div className="lg:col-span-2 space-y-8">
            {/* Personal Information */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>المعلومات الشخصية</CardTitle>
                  {!editing ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEditing(true)}
                    >
                      <Edit3 className="h-4 w-4 mr-2" />
                      تعديل
                    </Button>
                  ) : (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={handleSaveProfile}
                        loading={loading}
                        disabled={loading}
                      >
                        <Save className="h-4 w-4 mr-2" />
                        حفظ
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={cancelEditing}
                        disabled={loading}
                      >
                        <X className="h-4 w-4 mr-2" />
                        إلغاء
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              
              <CardContent>
                {errors.general && (
                  <div className="mb-4 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md text-sm">
                    {errors.general}
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Input
                    label="الاسم الكامل"
                    name="name"
                    value={profileData.name}
                    onChange={handleProfileChange}
                    error={errors.name}
                    disabled={!editing}
                    required
                  />

                  <Input
                    label="رقم الهاتف"
                    name="phone"
                    type="tel"
                    value={profileData.phone}
                    onChange={handleProfileChange}
                    error={errors.phone}
                    disabled={!editing}
                    required
                  />

                  <Input
                    label="العمر"
                    name="age"
                    type="number"
                    value={profileData.age.toString()}
                    onChange={handleProfileChange}
                    error={errors.age}
                    disabled={!editing}
                    min="5"
                    max="100"
                    required
                  />

                  <Input
                    label="رقم هاتف ولي الأمر"
                    name="fatherPhone"
                    type="tel"
                    value={profileData.fatherPhone}
                    onChange={handleProfileChange}
                    error={errors.fatherPhone}
                    disabled={!editing}
                    required
                  />
                </div>
              </CardContent>
            </Card>

            {/* Change Password */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>تغيير كلمة المرور</CardTitle>
                  {!changingPassword ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setChangingPassword(true)}
                    >
                      <Lock className="h-4 w-4 mr-2" />
                      تغيير كلمة المرور
                    </Button>
                  ) : (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={handleChangePassword}
                        loading={passwordLoading}
                        disabled={passwordLoading}
                      >
                        <Save className="h-4 w-4 mr-2" />
                        حفظ
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={cancelPasswordChange}
                        disabled={passwordLoading}
                      >
                        <X className="h-4 w-4 mr-2" />
                        إلغاء
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              
              <CardContent>
                {changingPassword && (
                  <>
                    {passwordErrors.general && (
                      <div className="mb-4 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md text-sm">
                        {passwordErrors.general}
                      </div>
                    )}

                    <div className="space-y-6">
                      <Input
                        label="كلمة المرور الحالية"
                        name="currentPassword"
                        type="password"
                        value={passwordData.currentPassword}
                        onChange={handlePasswordChange}
                        error={passwordErrors.currentPassword}
                        required
                      />

                      <Input
                        label="كلمة المرور الجديدة"
                        name="newPassword"
                        type="password"
                        value={passwordData.newPassword}
                        onChange={handlePasswordChange}
                        error={passwordErrors.newPassword}
                        required
                      />

                      <Input
                        label="تأكيد كلمة المرور الجديدة"
                        name="confirmPassword"
                        type="password"
                        value={passwordData.confirmPassword}
                        onChange={handlePasswordChange}
                        error={passwordErrors.confirmPassword}
                        required
                      />
                    </div>
                  </>
                )}

                {!changingPassword && (
                  <p className="text-gray-600 text-sm">
                    لحماية حسابك، ننصح بتغيير كلمة المرور بانتظام واستخدام كلمة مرور قوية.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
