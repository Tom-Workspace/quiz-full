'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { Eye, EyeOff, Mail, Lock, User, LogIn, Loader, CheckCircle, AlertCircle, BookOpen, Brain, Zap } from 'lucide-react';
import Link from 'next/link';

interface LoginForm {
  phone: string;
  password: string;
}

interface FormErrors {
  phone?: string;
  password?: string;
  general?: string;
}

export default function LoginPage() {
  const router = useRouter();
  const { login, user } = useAuth();
  const { theme } = useTheme();
  
  const [formData, setFormData] = useState<LoginForm>({
    phone: '',
    password: ''
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    setMounted(true);
    
    // Server-side preferred redirect via middleware: if user exists, go to root
    if (user) {
      router.replace('/');
    }
  }, [user, router]);

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    // Phone validation
    if (!formData.phone) {
      newErrors.phone = 'رقم الهاتف مطلوب';
    } else if (!/^01[0-9]{9}$/.test(formData.phone)) {
      newErrors.phone = 'يرجى إدخال رقم هاتف مصري صحيح';
    }

    // Password validation
    if (!formData.password) {
      newErrors.password = 'كلمة المرور مطلوبة';
    } else if (formData.password.length < 1) {
      newErrors.password = 'كلمة المرور مطلوبة';
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
      await login(formData.phone, formData.password);
      setSuccess(true);
      // Navigate to root; middleware will route to dashboard based on role
      router.replace('/');
      
    } catch (error: any) {
      setErrors({
        general: error.response?.data?.message || 'حدث خطأ في تسجيل الدخول'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof LoginForm) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [field]: e.target.value
    }));
    
    // Clear field error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: undefined
      }));
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
        ? 'dark bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900' 
        : 'bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50'
    }`}>
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-400 dark:bg-blue-600 rounded-full mix-blend-multiply dark:mix-blend-normal filter blur-xl opacity-20 animate-blob"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-400 dark:bg-purple-600 rounded-full mix-blend-multiply dark:mix-blend-normal filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute top-40 left-40 w-80 h-80 bg-pink-400 dark:bg-pink-600 rounded-full mix-blend-multiply dark:mix-blend-normal filter blur-xl opacity-20 animate-blob animation-delay-4000"></div>
      </div>

      <div className="relative w-full max-w-md mx-auto px-6">
        {/* Logo and Header */}
        <div className="text-center mb-8 animate-fade-in">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl shadow-lg mb-6 transform hover:scale-105 transition-transform duration-200">
            <Brain className="h-10 w-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            مرحباً بعودتك! 👋
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            سجل دخولك للوصول إلى منصة الكويزات
          </p>
        </div>

        {/* Login Form */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 backdrop-blur-sm bg-opacity-95 dark:bg-opacity-95 border border-gray-200 dark:border-gray-700 animate-slide-up">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* General Error */}
            {errors.general && (
              <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg animate-shake">
                <div className="flex items-center">
                  <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
                  <span className="text-red-700 dark:text-red-300">{errors.general}</span>
                </div>
              </div>
            )}

            {/* Success Message */}
            {success && (
              <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg animate-bounce-in">
                <div className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                  <span className="text-green-700 dark:text-green-300">تم تسجيل الدخول بنجاح!</span>
                </div>
              </div>
            )}

            {/* Phone Field */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                رقم الهاتف
              </label>
              <div className="relative">
                <User className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input
                  type="tel"
                  value={formData.phone}
                  onChange={handleInputChange('phone')}
                  className={`pr-12 transition-all duration-200 hover:shadow-md focus:shadow-lg ${
                    errors.phone 
                      ? 'border-red-500 focus:border-red-500 focus:ring-red-500' 
                      : 'focus:border-blue-500 focus:ring-blue-500'
                  }`}
                  placeholder="أدخل رقم هاتفك"
                  disabled={loading}
                />
              </div>
              {errors.phone && (
                <p className="text-red-500 text-sm flex items-center animate-fade-in">
                  <AlertCircle className="h-4 w-4 mr-1" />
                  {errors.phone}
                </p>
              )}
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                كلمة المرور
              </label>
              <div className="relative">
                <Lock className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={handleInputChange('password')}
                  className={`pr-12 pl-12 transition-all duration-200 hover:shadow-md focus:shadow-lg ${
                    errors.password 
                      ? 'border-red-500 focus:border-red-500 focus:ring-red-500' 
                      : 'focus:border-blue-500 focus:ring-blue-500'
                  }`}
                  placeholder="أدخل كلمة المرور"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                  disabled={loading}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-red-500 text-sm flex items-center animate-fade-in">
                  <AlertCircle className="h-4 w-4 mr-1" />
                  {errors.password}
                </p>
              )}
            </div>

            {/* Remember Me & Forgot Password */}
            <div className="flex items-center justify-between">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500 dark:bg-gray-700"
                />
                <span className="mr-2 text-sm text-gray-600 dark:text-gray-300">تذكرني</span>
              </label>
              <Link 
                href="/auth/forgot-password" 
                className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors"
              >
                نسيت كلمة المرور؟
              </Link>
            </div>

            {/* Login Button */}
            <Button
              type="submit"
              disabled={loading}
              className={`w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-3 px-4 rounded-lg shadow-lg transform transition-all duration-200 ${
                loading ? 'scale-95' : 'hover:scale-105'
              } focus:outline-none focus:ring-4 focus:ring-blue-300 dark:focus:ring-blue-800`}
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <Loader className="animate-spin h-5 w-5 mr-2" />
                  جاري تسجيل الدخول...
                </div>
              ) : (
                <div className="flex items-center justify-center">
                  <LogIn className="h-5 w-5 mr-2" />
                  تسجيل الدخول
                </div>
              )}
            </Button>

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300 dark:border-gray-600"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400">أو</span>
              </div>
            </div>

            {/* Register Link */}
            <div className="text-center">
              <p className="text-gray-600 dark:text-gray-300">
                ليس لديك حساب؟{' '}
                <Link 
                  href="/auth/register" 
                  className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-semibold transition-colors"
                >
                  سجل الآن
                </Link>
              </p>
            </div>
          </form>
        </div>

        {/* Features Preview */}
        <div className="mt-8 text-center animate-fade-in animation-delay-1000">
          <div className="grid grid-cols-3 gap-4 max-w-sm mx-auto">
            <div className="flex flex-col items-center p-3 bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200">
              <BookOpen className="h-8 w-8 text-blue-600 dark:text-blue-400 mb-2" />
              <span className="text-xs text-gray-600 dark:text-gray-300">كويزات متنوعة</span>
            </div>
            <div className="flex flex-col items-center p-3 bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200">
              <Zap className="h-8 w-8 text-yellow-600 dark:text-yellow-400 mb-2" />
              <span className="text-xs text-gray-600 dark:text-gray-300">نتائج فورية</span>
            </div>
            <div className="flex flex-col items-center p-3 bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200">
              <User className="h-8 w-8 text-green-600 dark:text-green-400 mb-2" />
              <span className="text-xs text-gray-600 dark:text-gray-300">ملف شخصي</span>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes blob {
          0% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slide-up {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }
        @keyframes bounce-in {
          0% { opacity: 0; transform: scale(0.3); }
          50% { opacity: 1; transform: scale(1.05); }
          70% { transform: scale(0.9); }
          100% { opacity: 1; transform: scale(1); }
        }
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
