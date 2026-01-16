'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { Eye, EyeOff, Mail, Lock, User, UserPlus, Loader, CheckCircle, AlertCircle, BookOpen, Brain, Zap, Phone } from 'lucide-react';
import Link from 'next/link';

interface RegisterForm {
  name: string;
  phone: string;
  age: string;
  fatherPhone: string;
  password: string;
  confirmPassword: string;
}

interface FormErrors {
  name?: string;
  phone?: string;
  age?: string;
  fatherPhone?: string;
  password?: string;
  confirmPassword?: string;
  general?: string;
}

export default function RegisterPage() {
  const router = useRouter();
  const { register, user } = useAuth();
  const { theme } = useTheme();
  
  const [formData, setFormData] = useState<RegisterForm>({
    name: '',
    phone: '',
    age: '',
    fatherPhone: '',
    password: '',
    confirmPassword: ''
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [success, setSuccess] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);

  useEffect(() => {
    setMounted(true);
    
    if (user) {
      router.push('/dashboard');
    }
  }, [user, router]);

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'الاسم مطلوب';
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'الاسم يجب أن يكون حرفين على الأقل';
    }

    if (!formData.phone) {
      newErrors.phone = 'رقم الهاتف مطلوب';
    } else if (!/^01[0-9]{9}$/.test(formData.phone)) {
      newErrors.phone = 'يرجى إدخال رقم هاتف صحيح (11 رقم)';
    }

    if (!formData.age) {
      newErrors.age = 'العمر مطلوب';
    }

    if (!formData.fatherPhone) {
      newErrors.fatherPhone = 'رقم هاتف الأب مطلوب';
    } else if (!/^01[0-9]{9}$/.test(formData.fatherPhone)) {
      newErrors.fatherPhone = 'يرجى إدخال رقم هاتف صحيح (11 رقم)';
    }

    if (!formData.password) {
      newErrors.password = 'كلمة المرور مطلوبة';
    } else if (formData.password.length < 6) {
      newErrors.password = 'كلمة المرور يجب أن تكون 6 أحرف على الأقل';
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'تأكيد كلمة المرور مطلوب';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'كلمة المرور غير متطابقة';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setLoading(true);
    setErrors({});

    try {
      await register(formData);
      setSuccess(true);
      
      setTimeout(() => {
        router.push('/auth/login');
      }, 2000);
      
    } catch (error: any) {
      setErrors({
        general: error.response?.data?.message || 'حدث خطأ في إنشاء الحساب'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof RegisterForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData(prev => ({
      ...prev,
      [field]: e.target.value
    }));
    
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: undefined
      }));
    }
  };

  const nextStep = () => {
    const step1Fields = ['name', 'phone', 'age', 'fatherPhone'];
    const step1Errors: FormErrors = {};
    
    step1Fields.forEach(field => {
      const key = field as keyof RegisterForm;
      if (!formData[key]) {
        step1Errors[key] = `${field === 'name' ? 'الاسم' : field === 'phone' ? 'رقم الهاتف' : field === 'age' ? 'العمر' : 'رقم هاتف الأب'} مطلوب`;
      }
    });

    if (formData.phone && !/^01[0-9]{9}$/.test(formData.phone)) {
      step1Errors.phone = 'يرجى إدخال رقم هاتف صحيح';
    }

    if (formData.fatherPhone && !/^01[0-9]{9}$/.test(formData.fatherPhone)) {
      step1Errors.fatherPhone = 'يرجى إدخال رقم هاتف صحيح';
    }

    setErrors(step1Errors);
    
    if (Object.keys(step1Errors).length === 0) {
      setCurrentStep(2);
    }
  };

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen flex items-center justify-center transition-all duration-500 ${
      theme === 'dark' 
        ? 'dark bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900' 
        : 'bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50'
    }`}>
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-400 dark:bg-purple-600 rounded-full mix-blend-multiply dark:mix-blend-normal filter blur-xl opacity-20 animate-blob"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-pink-400 dark:bg-pink-600 rounded-full mix-blend-multiply dark:mix-blend-normal filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute top-40 left-40 w-80 h-80 bg-blue-400 dark:bg-blue-600 rounded-full mix-blend-multiply dark:mix-blend-normal filter blur-xl opacity-20 animate-blob animation-delay-4000"></div>
      </div>

      <div className="relative w-full max-w-md mx-auto px-6">
        {/* Header */}
        <div className="text-center mb-8 animate-fade-in">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl shadow-lg mb-6 transform hover:scale-105 transition-transform duration-200">
            <Brain className="h-10 w-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            انضم إلينا! 🚀
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            أنشئ حسابك واستمتع بتجربة التعلم الرائعة
          </p>
        </div>

        {/* Progress Indicator */}
        <div className="mb-8 animate-slide-up">
          <div className="flex items-center justify-center space-x-4 rtl:space-x-reverse">
            <div className={`w-3 h-3 rounded-full transition-colors duration-200 ${
              currentStep >= 1 ? 'bg-purple-600' : 'bg-gray-300 dark:bg-gray-600'
            }`}></div>
            <div className={`w-16 h-1 rounded transition-colors duration-200 ${
              currentStep >= 2 ? 'bg-purple-600' : 'bg-gray-300 dark:bg-gray-600'
            }`}></div>
            <div className={`w-3 h-3 rounded-full transition-colors duration-200 ${
              currentStep >= 2 ? 'bg-purple-600' : 'bg-gray-300 dark:bg-gray-600'
            }`}></div>
          </div>
          <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-2">
            <span>المعلومات الأساسية</span>
            <span>كلمة المرور والتأكيد</span>
          </div>
        </div>

        {/* Form */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 backdrop-blur-sm bg-opacity-95 dark:bg-opacity-95 border border-gray-200 dark:border-gray-700 animate-slide-up">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Messages */}
            {errors.general && (
              <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg animate-shake">
                <div className="flex items-center">
                  <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
                  <span className="text-red-700 dark:text-red-300">{errors.general}</span>
                </div>
              </div>
            )}

            {success && (
              <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg animate-bounce-in">
                <div className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                  <span className="text-green-700 dark:text-green-300">تم إنشاء الحساب بنجاح! جاري التحويل لتسجيل الدخول...</span>
                </div>
              </div>
            )}

            {/* Step 1: Basic Info */}
            {currentStep === 1 && (
              <div className="space-y-6 animate-fade-in">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">الاسم الكامل</label>
                  <div className="relative">
                    <User className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <Input
                      type="text"
                      value={formData.name}
                      onChange={handleInputChange('name')}
                      className={`pr-12 ${errors.name ? 'border-red-500' : ''}`}
                      placeholder="أدخل اسمك الكامل"
                    />
                  </div>
                  {errors.name && <p className="text-red-500 text-sm flex items-center"><AlertCircle className="h-4 w-4 mr-1" />{errors.name}</p>}
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">رقم الهاتف</label>
                  <div className="relative">
                    <Phone className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <Input
                      type="tel"
                      value={formData.phone}
                      onChange={handleInputChange('phone')}
                      className={`pr-12 ${errors.phone ? 'border-red-500' : ''}`}
                      placeholder="01xxxxxxxxx"
                    />
                  </div>
                  {errors.phone && <p className="text-red-500 text-sm flex items-center"><AlertCircle className="h-4 w-4 mr-1" />{errors.phone}</p>}
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">العمر</label>
                  <div className="relative">
                    <Input
                      type="number"
                      value={formData.age}
                      onChange={handleInputChange('age')}
                      className={`pr-12 ${errors.age ? 'border-red-500' : ''}`}
                      placeholder="أدخل عمرك"
                    />
                  </div>
                  {errors.age && <p className="text-red-500 text-sm flex items-center"><AlertCircle className="h-4 w-4 mr-1" />{errors.age}</p>}
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">رقم هاتف الأب</label>
                  <div className="relative">
                    <Phone className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <Input
                      type="tel"
                      value={formData.fatherPhone}
                      onChange={handleInputChange('fatherPhone')}
                      className={`pr-12 ${errors.fatherPhone ? 'border-red-500' : ''}`}
                      placeholder="01xxxxxxxxx"
                    />
                  </div>
                  {errors.fatherPhone && <p className="text-red-500 text-sm flex items-center"><AlertCircle className="h-4 w-4 mr-1" />{errors.fatherPhone}</p>}
                </div>

                <Button
                  type="button"
                  onClick={nextStep}
                  className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                >
                  التالي
                </Button>
              </div>
            )}

            {/* Step 2: Password */}
            {currentStep === 2 && (
              <div className="space-y-6 animate-fade-in">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">كلمة المرور</label>
                  <div className="relative">
                    <Lock className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      value={formData.password}
                      onChange={handleInputChange('password')}
                      className={`pr-12 pl-12 ${errors.password ? 'border-red-500' : ''}`}
                      placeholder="أدخل كلمة مرور قوية"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                  {errors.password && <p className="text-red-500 text-sm flex items-center"><AlertCircle className="h-4 w-4 mr-1" />{errors.password}</p>}
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">تأكيد كلمة المرور</label>
                  <div className="relative">
                    <Lock className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <Input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={formData.confirmPassword}
                      onChange={handleInputChange('confirmPassword')}
                      className={`pr-12 pl-12 ${errors.confirmPassword ? 'border-red-500' : ''}`}
                      placeholder="أعد إدخال كلمة المرور"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    >
                      {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                  {errors.confirmPassword && <p className="text-red-500 text-sm flex items-center"><AlertCircle className="h-4 w-4 mr-1" />{errors.confirmPassword}</p>}
                </div>

                <div className="flex space-x-3 rtl:space-x-reverse">
                  <Button
                    type="button"
                    onClick={() => setCurrentStep(1)}
                    variant="outline"
                    className="w-full"
                  >
                    السابق
                  </Button>
                  <Button
                    type="submit"
                    disabled={loading}
                    className={`w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 ${
                      loading ? 'scale-95' : 'hover:scale-105'
                    } transition-transform`}
                  >
                    {loading ? (
                      <div className="flex items-center justify-center">
                        <Loader className="animate-spin h-5 w-5 mr-2" />
                        جاري إنشاء الحساب...
                      </div>
                    ) : (
                      <div className="flex items-center justify-center">
                        <UserPlus className="h-5 w-5 mr-2" />
                        إنشاء الحساب
                      </div>
                    )}
                  </Button>
                </div>
              </div>
            )}

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300 dark:border-gray-600"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400">أو</span>
              </div>
            </div>

            <div className="text-center">
              <p className="text-gray-600 dark:text-gray-300">
                لديك حساب بالفعل؟{' '}
                <Link 
                  href="/auth/login" 
                  className="text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-300 font-semibold transition-colors"
                >
                  سجل دخولك
                </Link>
              </p>
            </div>
          </form>
        </div>

        {/* Features */}
        <div className="mt-8 text-center animate-fade-in animation-delay-1000">
          <div className="grid grid-cols-3 gap-4 max-w-sm mx-auto">
            <div className="flex flex-col items-center p-3 bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200">
              <BookOpen className="h-8 w-8 text-purple-600 dark:text-purple-400 mb-2" />
              <span className="text-xs text-gray-600 dark:text-gray-300">تعلم ممتع</span>
            </div>
            <div className="flex flex-col items-center p-3 bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200">
              <Zap className="h-8 w-8 text-yellow-600 dark:text-yellow-400 mb-2" />
              <span className="text-xs text-gray-600 dark:text-gray-300">سرعة وسهولة</span>
            </div>
            <div className="flex flex-col items-center p-3 bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200">
              <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400 mb-2" />
              <span className="text-xs text-gray-600 dark:text-gray-300">نتائج دقيقة</span>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes blob { 0% { transform: translate(0px, 0px) scale(1); } 33% { transform: translate(30px, -50px) scale(1.1); } 66% { transform: translate(-20px, 20px) scale(0.9); } 100% { transform: translate(0px, 0px) scale(1); } }
        @keyframes fade-in { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes slide-up { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes shake { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-5px); } 75% { transform: translateX(5px); } }
        @keyframes bounce-in { 0% { opacity: 0; transform: scale(0.3); } 50% { opacity: 1; transform: scale(1.05); } 70% { transform: scale(0.9); } 100% { opacity: 1; transform: scale(1); } }
        .animate-blob { animation: blob 7s infinite; }
        .animate-fade-in { animation: fade-in 0.6s ease-out; }
        .animate-slide-up { animation: slide-up 0.8s ease-out; }
        .animate-shake { animation: shake 0.5s ease-in-out; }
        .animate-bounce-in { animation: bounce-in 0.6s ease-out; }
        .animation-delay-1000 { animation-delay: 1s; }
        .animation-delay-2000 { animation-delay: 2s; }
        .animation-delay-4000 { animation-delay: 4s; }
      `}</style>
    </div>
  );
}
