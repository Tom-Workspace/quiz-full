'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { quizzesAPI } from '@/lib/api';
import { formatDate, formatDuration } from '@/lib/utils';
import { Clock, Users, BookOpen, Trophy, Search, Filter } from 'lucide-react';
import Link from 'next/link';
import Input from '@/components/ui/Input';

interface Quiz {
  _id: string;
  title: string;
  description: string;
  questions: any[];
  settings: {
    duration: number;
    startDate: string;
    endDate: string;
    maxAttempts: number;
    showResults: boolean;
  };
  createdBy: {
    name: string;
  };
  attempts?: number;
  userAttempts?: number;
  isActive: boolean;
}

const QuizzesPage: React.FC = () => {
  const { user } = useAuth();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'all' | 'available' | 'completed'>('available');

  useEffect(() => {
    if (user && user.role === 'student') {
      loadQuizzes();
    }
  }, [user, filter]);

  const loadQuizzes = async () => {
    try {
      setLoading(true);
      const params: any = {};
      
      if (filter === 'available') {
        params.activeOnly = true;
      }
      
      const response = await quizzesAPI.getAll(params);
      setQuizzes(response.data.data.quizzes);
    } catch (error) {
      console.error('Error loading quizzes:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredQuizzes = quizzes.filter(quiz => {
    const matchesSearch = quiz.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         quiz.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (filter === 'available') {
      return matchesSearch && quiz.isActive && (quiz.userAttempts || 0) < quiz.settings.maxAttempts;
    } else if (filter === 'completed') {
      return matchesSearch && (quiz.userAttempts || 0) >= quiz.settings.maxAttempts;
    }
    
    return matchesSearch;
  });

  const getQuizStatus = (quiz: Quiz) => {
    const now = new Date();
    const startDate = new Date(quiz.settings.startDate);
    const endDate = new Date(quiz.settings.endDate);
    const userAttempts = quiz.userAttempts || 0;

    if (now < startDate) {
      return { status: 'upcoming', label: 'قريباً', color: 'text-blue-600 bg-blue-100' };
    } else if (now > endDate) {
      return { status: 'expired', label: 'منتهي', color: 'text-gray-600 bg-gray-100' };
    } else if (userAttempts >= quiz.settings.maxAttempts) {
      return { status: 'completed', label: 'مكتمل', color: 'text-green-600 bg-green-100' };
    } else {
      return { status: 'available', label: 'متاح', color: 'text-green-600 bg-green-100' };
    }
  };

  if (!user || user.role !== 'student') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">غير مصرح لك بالوصول</h1>
          <p className="text-gray-600">هذه الصفحة مخصصة للطلاب فقط</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">الكويزات المتاحة</h1>
          
          {/* Search and Filter */}
          <div className="bg-white p-6 rounded-lg shadow-sm mb-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                  <Input
                    type="text"
                    placeholder="البحث عن كويز..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <div className="flex gap-2">
                <Button
                  variant={filter === 'available' ? 'primary' : 'outline'}
                  onClick={() => setFilter('available')}
                  size="sm"
                >
                  المتاحة
                </Button>
                <Button
                  variant={filter === 'completed' ? 'primary' : 'outline'}
                  onClick={() => setFilter('completed')}
                  size="sm"
                >
                  المكتملة
                </Button>
                <Button
                  variant={filter === 'all' ? 'primary' : 'outline'}
                  onClick={() => setFilter('all')}
                  size="sm"
                >
                  الكل
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Quizzes Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
          </div>
        ) : filteredQuizzes.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredQuizzes.map((quiz, index) => {
              const status = getQuizStatus(quiz);
              return (
                <Card 
                  key={quiz._id} 
                  className="hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1 animate-fade-in"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <CardHeader>
                    <div className="flex justify-between items-start mb-2">
                      <CardTitle className="text-lg">{quiz.title}</CardTitle>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${status.color}`}>
                        {status.label}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 line-clamp-2">{quiz.description}</p>
                  </CardHeader>
                  
                  <CardContent>
                    <div className="space-y-3">
                      {/* Quiz Stats */}
                      <div className="flex items-center justify-between text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <BookOpen className="h-4 w-4" />
                          <span>{quiz.questions.length} سؤال</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          <span>{formatDuration(quiz.settings.duration)}</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <Users className="h-4 w-4" />
                          <span>المعلم: {quiz.createdBy.name}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Trophy className="h-4 w-4" />
                          <span>{quiz.userAttempts || 0}/{quiz.settings.maxAttempts}</span>
                        </div>
                      </div>
                      
                      {/* Dates */}
                      <div className="text-xs text-gray-500 space-y-1">
                        <div>يبدأ: {formatDate(quiz.settings.startDate)}</div>
                        <div>ينتهي: {formatDate(quiz.settings.endDate)}</div>
                      </div>
                      
                      {/* Action Button */}
                      <div className="pt-4">
                        {status.status === 'available' ? (
                          <Link href={`/quizzes/${quiz._id}`} className="w-full block">
                            <Button className="w-full">ابدأ الكويز</Button>
                          </Link>
                        ) : status.status === 'completed' ? (
                          <Link href={`/results?quiz=${quiz._id}`} className="w-full block">
                            <Button variant="outline" className="w-full">عرض النتيجة</Button>
                          </Link>
                        ) : status.status === 'upcoming' ? (
                          <Button disabled className="w-full">لم يبدأ بعد</Button>
                        ) : (
                          <Button disabled className="w-full">منتهي الصلاحية</Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12">
            <BookOpen className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">لا توجد كويزات</h3>
            <p className="text-gray-600">لا توجد كويزات تطابق معايير البحث الخاصة بك</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default QuizzesPage;
