'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { quizzesAPI } from '@/lib/api';
import { 
  Plus, 
  Trash2, 
  Save, 
  Eye, 
  Settings, 
  Calendar,
  Clock,
  Users,
  BookOpen,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

interface Question {
  type: 'text' | 'image' | 'audio';
  content: string;
  mediaUrl?: string;
  answerType: 'single-choice' | 'multiple-choice' | 'image-selection' | 'text-answer';
  options: Array<{
    text: string;
    imageUrl?: string;
    isCorrect: boolean;
  }>;
  correctAnswer: string;
  points: number;
  timeLimit: number;
  explanation?: string;
}

interface QuizSettings {
  duration: number;
  startDate: string;
  endDate: string;
  maxAttempts: number;
  showResults: boolean;
  randomizeQuestions: boolean;
  randomizeOptions: boolean;
  passingScore: number;
}

const NewQuizPage: React.FC = () => {
  const { user } = useAuth();
  const router = useRouter();
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const [settings, setSettings] = useState<QuizSettings>({
    duration: 60,
    startDate: new Date().toISOString().slice(0, 16),
    endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
    maxAttempts: 3,
    showResults: true,
    randomizeQuestions: false,
    randomizeOptions: false,
    passingScore: 60
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const addQuestion = () => {
    const newQuestion: Question = {
      type: 'text',
      content: '',
      answerType: 'single-choice',
      options: [
        { text: '', isCorrect: true },
        { text: '', isCorrect: false },
        { text: '', isCorrect: false },
        { text: '', isCorrect: false }
      ],
      correctAnswer: '',
      points: 1,
      timeLimit: 60,
      explanation: ''
    };
    
    setQuestions(prev => [...prev, newQuestion]);
    setCurrentQuestionIndex(questions.length);
  };

  const updateQuestion = (index: number, updates: Partial<Question>) => {
    setQuestions(prev => prev.map((q, i) => i === index ? { ...q, ...updates } : q));
  };

  const deleteQuestion = (index: number) => {
    if (confirm('هل أنت متأكد من حذف هذا السؤال؟')) {
      setQuestions(prev => prev.filter((_, i) => i !== index));
      if (currentQuestionIndex === index) {
        setCurrentQuestionIndex(null);
      } else if (currentQuestionIndex !== null && currentQuestionIndex > index) {
        setCurrentQuestionIndex(currentQuestionIndex - 1);
      }
    }
  };

  const updateQuestionOption = (questionIndex: number, optionIndex: number, text: string) => {
    const question = questions[questionIndex];
    const newOptions = [...question.options];
    newOptions[optionIndex] = { ...newOptions[optionIndex], text };
    updateQuestion(questionIndex, { options: newOptions });
  };

  const updateOptionCorrectness = (questionIndex: number, optionIndex: number, isCorrect: boolean) => {
    const question = questions[questionIndex];
    const newOptions = [...question.options];
    
    if (question.answerType === 'single-choice') {
      // For single choice, only one option can be correct
      newOptions.forEach((opt, i) => {
        opt.isCorrect = i === optionIndex ? isCorrect : false;
      });
      // Update correctAnswer to match the correct option text
      if (isCorrect) {
        updateQuestion(questionIndex, { 
          options: newOptions,
          correctAnswer: newOptions[optionIndex].text
        });
      }
    } else {
      // For multiple choice, multiple options can be correct
      newOptions[optionIndex] = { ...newOptions[optionIndex], isCorrect };
      const correctAnswers = newOptions.filter(opt => opt.isCorrect).map(opt => opt.text);
      updateQuestion(questionIndex, { 
        options: newOptions,
        correctAnswer: correctAnswers.join(',')
      });
    }
  };

  const addOption = (questionIndex: number) => {
    const question = questions[questionIndex];
    updateQuestion(questionIndex, { 
      options: [...question.options, { text: '', isCorrect: false }] 
    });
  };

  const removeOption = (questionIndex: number, optionIndex: number) => {
    const question = questions[questionIndex];
    if (question.options.length <= 2) return;
    
    const newOptions = question.options.filter((_, i) => i !== optionIndex);
    
    // Update correctAnswer if the removed option was correct
    const correctAnswers = newOptions.filter(opt => opt.isCorrect).map(opt => opt.text);
    const newCorrectAnswer = question.answerType === 'single-choice' 
      ? (correctAnswers[0] || '') 
      : correctAnswers.join(',');
    
    updateQuestion(questionIndex, { 
      options: newOptions,
      correctAnswer: newCorrectAnswer
    });
  };

  const validateQuiz = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!title.trim()) {
      newErrors.title = 'عنوان الكويز مطلوب';
    }

    if (!description.trim()) {
      newErrors.description = 'وصف الكويز مطلوب';
    }

    if (questions.length === 0) {
      newErrors.questions = 'يجب إضافة سؤال واحد على الأقل';
    }

    // Validate each question
    questions.forEach((question, index) => {
      if (!question.content.trim()) {
        newErrors[`question_${index}`] = 'نص السؤال مطلوب';
      }

      if (question.answerType === 'single-choice' || question.answerType === 'multiple-choice') {
        const validOptions = question.options.filter(opt => opt.text.trim());
        if (validOptions.length < 2) {
          newErrors[`question_${index}_options`] = 'يجب إضافة خيارين صحيحين على الأقل';
        }
        
        const correctOptions = question.options.filter(opt => opt.isCorrect);
        if (correctOptions.length === 0) {
          newErrors[`question_${index}_correct`] = 'يجب تحديد الإجابة الصحيحة';
        }
      }

      if (question.points <= 0) {
        newErrors[`question_${index}_points`] = 'النقاط يجب أن تكون أكبر من صفر';
      }
    });

    // Validate settings
    if (new Date(settings.startDate) >= new Date(settings.endDate)) {
      newErrors.endDate = 'تاريخ النهاية يجب أن يكون بعد تاريخ البداية';
    }

    if (settings.duration <= 0) {
      newErrors.duration = 'مدة الكويز يجب أن تكون أكبر من صفر';
    }

    if (settings.maxAttempts <= 0) {
      newErrors.maxAttempts = 'عدد المحاولات المسموحة يجب أن يكون أكبر من صفر';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSaveQuiz = async () => {
    if (!validateQuiz()) return;

    setLoading(true);
    try {
      const quizData = {
        title: title.trim(),
        description: description.trim(),
        questions: questions.map(q => ({
          type: q.type,
          content: q.content.trim(),
          mediaUrl: q.mediaUrl || undefined,
          answerType: q.answerType,
          options: (q.answerType === 'single-choice' || q.answerType === 'multiple-choice') 
            ? q.options.filter(opt => opt.text.trim()).map(opt => ({
                text: opt.text.trim(),
                imageUrl: opt.imageUrl,
                isCorrect: opt.isCorrect
              }))
            : undefined,
          correctAnswer: q.correctAnswer,
          points: q.points,
          timeLimit: q.timeLimit
        })),
        settings: {
          ...settings,
          startDate: new Date(settings.startDate).toISOString(),
          endDate: new Date(settings.endDate).toISOString()
        }
      };

      await quizzesAPI.create(quizData);
      
      // Show success message
      const successDiv = document.createElement('div');
      successDiv.className = 'fixed top-4 right-4 bg-green-100 border border-green-200 text-green-700 px-4 py-3 rounded-lg z-50';
      successDiv.textContent = 'تم إنشاء الكويز بنجاح!';
      document.body.appendChild(successDiv);
      
      setTimeout(() => {
        document.body.removeChild(successDiv);
        router.push('/manage/quizzes');
      }, 2000);
      
    } catch (error: any) {
      setErrors({ general: error.response?.data?.message || 'حدث خطأ في إنشاء الكويز' });
    } finally {
      setLoading(false);
    }
  };

  if (!user || (user.role !== 'teacher' && user.role !== 'admin')) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">غير مصرح لك بالوصول</h1>
          <p className="text-gray-600">هذه الصفحة مخصصة للمعلمين والمسؤولين فقط</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-3xl font-bold text-gray-900">إنشاء كويز جديد</h1>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => router.push('/manage/quizzes')}
              >
                إلغاء
              </Button>
              <Button
                onClick={handleSaveQuiz}
                loading={loading}
                disabled={loading || questions.length === 0}
              >
                <Save className="h-5 w-5 mr-2" />
                حفظ الكويز
              </Button>
            </div>
          </div>
        </div>

        {errors.general && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md">
            {errors.general}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Info */}
            <Card>
              <CardHeader>
                <CardTitle>معلومات أساسية</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Input
                    label="عنوان الكويز"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    error={errors.title}
                    placeholder="أدخل عنوان الكويز"
                    required
                  />
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      وصف الكويز <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="أدخل وصف الكويز"
                      rows={3}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        errors.description ? 'border-red-300' : 'border-gray-300'
                      }`}
                    />
                    {errors.description && (
                      <p className="mt-1 text-sm text-red-600">{errors.description}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Questions */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>الأسئلة ({questions.length})</CardTitle>
                  <Button onClick={addQuestion}>
                    <Plus className="h-4 w-4 mr-2" />
                    إضافة سؤال
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {errors.questions && (
                  <div className="mb-4 text-red-600 text-sm">{errors.questions}</div>
                )}
                
                {questions.length === 0 ? (
                  <div className="text-center py-8">
                    <BookOpen className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                    <p className="text-gray-600">لم تقم بإضافة أي أسئلة بعد</p>
                    <Button onClick={addQuestion} className="mt-4">
                      <Plus className="h-4 w-4 mr-2" />
                      إضافة السؤال الأول
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {questions.map((question, index) => (
                      <div key={question.content} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="font-medium">السؤال {index + 1}</h4>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => 
                                setCurrentQuestionIndex(
                                  currentQuestionIndex === index ? null : index
                                )
                              }
                            >
                              {currentQuestionIndex === index ? (
                                <ChevronUp className="h-4 w-4" />
                              ) : (
                                <ChevronDown className="h-4 w-4" />
                              )}
                            </Button>
                            <Button
                              variant="danger"
                              size="sm"
                              onClick={() => deleteQuestion(index)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>

                        {currentQuestionIndex === index && (
                          <div className="space-y-4">
                            {/* Question Text */}
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                نص السؤال *
                              </label>
                              <textarea
                                value={question.content}
                                onChange={(e) => updateQuestion(index, { content: e.target.value })}
                                placeholder="أدخل نص السؤال"
                                rows={2}
                                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                  errors[`question_${index}`] ? 'border-red-300' : 'border-gray-300'
                                }`}
                              />
                              {errors[`question_${index}`] && (
                                <p className="mt-1 text-sm text-red-600">{errors[`question_${index}`]}</p>
                              )}
                            </div>

                            {/* Question Type */}
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                نوع السؤال
                              </label>
                              <select
                                value={question.answerType}
                                onChange={(e) => updateQuestion(index, { 
                                  answerType: e.target.value as Question['answerType'],
                                  correctAnswer: e.target.value === 'true_false' ? true : 0
                                })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                              >
                                <option value="single-choice">اختيار واحد</option>
                                <option value="multiple-choice">اختيار متعدد</option>
                                <option value="image-selection">اختيار صورة</option>
                                <option value="text-answer">إجابة نصية</option>
                              </select>
                            </div>

                            {/* Question Options */}
                            {(question.answerType === 'single-choice' || question.answerType === 'multiple-choice') && (
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                  الخيارات
                                </label>
                                <div className="space-y-2">
                                  {question.options.map((option, optionIndex) => (
                                    <div key={optionIndex} className="flex gap-2">
                                      <input
                                        type="radio"
                                        name={`correct_${index}`}
                                        checked={option.isCorrect}
                                        onChange={() => updateOptionCorrectness(index, optionIndex, true)}
                                        className="mt-2"
                                      />
                                      <input
                                        type="text"
                                        value={option.text}
                                        onChange={(e) => updateQuestionOption(index, optionIndex, e.target.value)}
                                        placeholder={`الخيار ${optionIndex + 1}`}
                                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                      />
                                      {question.options.length > 2 && (
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() => removeOption(index, optionIndex)}
                                        >
                                          <Trash2 className="h-4 w-4" />
                                        </Button>
                                      )}
                                    </div>
                                  ))}
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => addOption(index)}
                                  >
                                    <Plus className="h-4 w-4 mr-2" />
                                    إضافة خيار
                                  </Button>
                                </div>
                                {errors[`question_${index}_options`] && (
                                  <p className="mt-1 text-sm text-red-600">{errors[`question_${index}_options`]}</p>
                                )}
                              </div>
                            )}

                            {/* Points */}
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                النقاط
                              </label>
                              <input
                                type="number"
                                value={question.points}
                                onChange={(e) => updateQuestion(index, { points: parseInt(e.target.value) || 1 })}
                                min="1"
                                className="w-20 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                              {errors[`question_${index}_points`] && (
                                <p className="mt-1 text-sm text-red-600">{errors[`question_${index}_points`]}</p>
                              )}
                            </div>

                            {/* Time Limit */}
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                الوقت المحدد
                              </label>
                              <input
                                type="number"
                                value={question.timeLimit}
                                onChange={(e) => updateQuestion(index, { timeLimit: parseInt(e.target.value) || 60 })}
                                min="1"
                                className="w-20 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                            </div>

                            {/* Explanation */}
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                التفسير (اختياري)
                              </label>
                              <textarea
                                value={question.explanation || ''}
                                onChange={(e) => updateQuestion(index, { explanation: e.target.value })}
                                placeholder="أدخل تفسير للإجابة الصحيحة"
                                rows={2}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            {/* Quiz Preview */}
            <Card>
              <CardHeader>
                <CardTitle>معاينة الكويز</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 text-sm">
                  <div className="flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-blue-600" />
                    <span>{questions.length} سؤال</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-blue-600" />
                    <span>{settings.duration} دقيقة</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-blue-600" />
                    <span>{settings.maxAttempts} محاولات مسموحة</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-600">
                      إجمالي النقاط: {questions.reduce((sum, q) => sum + q.points, 0)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Settings */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>إعدادات الكويز</CardTitle>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowSettings(!showSettings)}
                  >
                    <Settings className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              {showSettings && (
                <CardContent>
                  <div className="space-y-4">
                    <Input
                      label="المدة بالدقائق"
                      type="number"
                      value={settings.duration.toString()}
                      onChange={(e) => setSettings(prev => ({ ...prev, duration: parseInt(e.target.value) || 60 }))}
                      error={errors.duration}
                      min="1"
                    />

                    <Input
                      label="تاريخ البداية"
                      type="datetime-local"
                      value={settings.startDate}
                      onChange={(e) => setSettings(prev => ({ ...prev, startDate: e.target.value }))}
                    />

                    <Input
                      label="تاريخ النهاية"
                      type="datetime-local"
                      value={settings.endDate}
                      onChange={(e) => setSettings(prev => ({ ...prev, endDate: e.target.value }))}
                      error={errors.endDate}
                    />

                    <Input
                      label="عدد المحاولات المسموحة"
                      type="number"
                      value={settings.maxAttempts.toString()}
                      onChange={(e) => setSettings(prev => ({ ...prev, maxAttempts: parseInt(e.target.value) || 3 }))}
                      error={errors.maxAttempts}
                      min="1"
                    />

                    <Input
                      label="درجة النجاح %"
                      type="number"
                      value={settings.passingScore.toString()}
                      onChange={(e) => setSettings(prev => ({ ...prev, passingScore: parseInt(e.target.value) || 60 }))}
                      min="0"
                      max="100"
                    />

                    <div className="space-y-3">
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={settings.showResults}
                          onChange={(e) => setSettings(prev => ({ ...prev, showResults: e.target.checked }))}
                        />
                        <span className="text-sm">عرض النتائج للطلاب</span>
                      </label>

                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={settings.randomizeQuestions}
                          onChange={(e) => setSettings(prev => ({ ...prev, randomizeQuestions: e.target.checked }))}
                        />
                        <span className="text-sm">ترتيب الأسئلة عشوائياً</span>
                      </label>

                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={settings.randomizeOptions}
                          onChange={(e) => setSettings(prev => ({ ...prev, randomizeOptions: e.target.checked }))}
                        />
                        <span className="text-sm">ترتيب الخيارات عشوائياً</span>
                      </label>
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NewQuizPage;
