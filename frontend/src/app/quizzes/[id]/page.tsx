'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { quizzesAPI, attemptsAPI } from '@/lib/api';
import { formatTime } from '@/lib/utils';
import { Clock, ChevronLeft, ChevronRight, Shield, AlertTriangle, Maximize2 } from 'lucide-react';
import socketService from '@/lib/socket';

interface Question {
  _id: string;
  type: 'text' | 'image' | 'audio';
  content: string;
  mediaUrl?: string;
  answerType: 'single-choice' | 'multiple-choice' | 'image-selection' | 'text-answer' | 'true-false';
  options?: Array<{
    _id: string;
    text: string;
    imageUrl?: string;
    isCorrect: boolean;
  }>;
  correctAnswer?: string;
  correctBoolean?: boolean;
  points: number;
  timeLimit?: number;
}

interface Answer {
  questionId: string;
  answer: string | string[] | boolean;
  timeSpent: number;
}

interface QuizSettings {
  duration: number;
  startDate: string;
  endDate: string;
  maxAttempts: number;
  showAnswers: 'immediately' | 'after-quiz-ends' | 'never';
  showScore: 'immediately' | 'after-quiz-ends' | 'never';
  allowResume: boolean;
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
}

interface Quiz {
  _id: string;
  title: string;
  description: string;
  questions: Question[];
  settings: QuizSettings;
  totalPoints?: number;
}

interface AttemptMeta {
  _id: string;
  startedAt?: string;
  attemptNumber?: number;
}

const QuizTakingPage: React.FC = () => {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useAuth();

  const quizId = params.id as string;
  const isPreview = searchParams?.get('preview') === '1';

  // Flow control
  const [phase, setPhase] = useState<'overview' | 'in-progress'>(isPreview ? 'in-progress' : 'overview');

  // Data
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [quizInfo, setQuizInfo] = useState<Partial<Quiz> | null>(null);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [attemptNumber, setAttemptNumber] = useState<number | null>(null);
  const [attemptsCount, setAttemptsCount] = useState<number>(0);

  // UI state
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [availabilityMessage, setAvailabilityMessage] = useState<string | null>(null);

  // Quiz progress state
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, Answer>>({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [questionStartTime, setQuestionStartTime] = useState<Date>(new Date());

  // Anti-cheat state
  const [warningShown, setWarningShown] = useState(false);
  const [tabSwitchCount, setTabSwitchCount] = useState(0);
  const [isWindowFocused, setIsWindowFocused] = useState(true);
  const [cheatingWarnings, setCheatingWarnings] = useState<string[]>([]);
  const warningCountRef = useRef(0);
  const autoSubmitTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initRef = useRef(false);

  // Helpers
  const toast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const div = document.createElement('div');
    div.className = `fixed top-4 right-4 px-4 py-3 rounded-lg z-50 ${
      type === 'success'
        ? 'bg-green-100 border border-green-200 text-green-700'
        : type === 'error'
        ? 'bg-red-100 border border-red-200 text-red-700'
        : 'bg-blue-100 border border-blue-200 text-blue-700'
    }`;
    div.textContent = message;
    document.body.appendChild(div);
    setTimeout(() => document.body.removeChild(div), 3000);
  };

  const shuffleArray = (array: any[]) => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  const addCheatingWarning = (warning: string) => {
    const timestamp = new Date().toLocaleTimeString('ar-EG');
    setCheatingWarnings((prev) => [...prev, `${timestamp}: ${warning}`]);

    if (attemptId) {
      attemptsAPI
        .logCheatingAttempt(attemptId, warning)
        .catch((err) => console.error('Error logging cheating attempt:', err));
    }
  };

  // Load overview data (quiz info + attempts count)
  useEffect(() => {
    let isMounted = true;
    if (!quizId || isPreview) return;

    const loadOverview = async () => {
      try {
        setLoading(true);
        const [quizResp, attemptsResp] = await Promise.all([
          quizzesAPI.getById(quizId),
          attemptsAPI.getUserAttempts({ quizId, limit: 1000 }),
        ]);

        const info = quizResp?.data?.data?.quiz || quizResp?.data?.data || null;
        const attempts = attemptsResp?.data?.data?.attempts || [];

        if (isMounted) {
          setQuizInfo(info);
          setAttemptsCount(attempts.length || 0);
        }
      } catch (e) {
        console.error('Error loading overview:', e);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadOverview();
    return () => {
      isMounted = false;
    };
  }, [quizId, isPreview]);

  // Preview: auto-load full quiz (no attempt)
  useEffect(() => {
    if (!quizId || !isPreview || initRef.current) return;

    const loadPreview = async () => {
      try {
        initRef.current = true;
        setLoading(true);
        const quizResponse = await quizzesAPI.getById(quizId, { includeQuestions: true });
        const quizData: Quiz = quizResponse.data.data.quiz;
        if (!quizData || !quizData.questions || quizData.questions.length === 0) {
          throw new Error('الكويز لا يحتوي على أسئلة');
        }

        // Shuffle for preview only if enabled
        let finalQuiz = { ...quizData } as Quiz;
        if (finalQuiz.settings?.shuffleQuestions) finalQuiz.questions = shuffleArray([...finalQuiz.questions]);
        if (finalQuiz.settings?.shuffleOptions)
          finalQuiz.questions = finalQuiz.questions.map((q) => ({ ...q, options: q.options ? shuffleArray([...q.options]) : q.options }));

        setQuiz(finalQuiz);
        setPhase('in-progress');
        setStartTime(new Date());
        setTimeLeft((finalQuiz.settings.duration || 0) * 60);
        setQuestionStartTime(new Date());
      } catch (error: any) {
        console.error('Error loading preview:', error);
        toast(error?.response?.data?.message || 'حدث خطأ في تحميل الكويز', 'error');
      } finally {
        setLoading(false);
      }
    };

    loadPreview();
  }, [quizId, isPreview]);

  // Start/resume attempt
  const handleStart = async () => {
    try {
      setStarting(true);
      setAvailabilityMessage(null);

      // Create or resume attempt; backend returns sanitized quiz
      const attemptResponse = await attemptsAPI.start(quizId);
      const attemptData: AttemptMeta = attemptResponse.data?.data?.attempt;
      const returnedQuiz: Quiz = attemptResponse.data?.data?.quiz;

      if (!returnedQuiz || !returnedQuiz.questions || returnedQuiz.questions.length === 0) {
        throw new Error('الكويز لا يحتوي على أسئلة');
      }

      // Optional: request fullscreen for stricter environment
      try {
        if (document.fullscreenEnabled && !document.fullscreenElement) {
          await document.documentElement.requestFullscreen();
        }
      } catch {
        // Ignore fullscreen errors
      }

      // Shuffle client-side if enabled
      let finalQuiz = { ...returnedQuiz } as Quiz;
      if (finalQuiz.settings?.shuffleQuestions) finalQuiz.questions = shuffleArray([...finalQuiz.questions]);
      if (finalQuiz.settings?.shuffleOptions)
        finalQuiz.questions = finalQuiz.questions.map((q) => ({ ...q, options: q.options ? shuffleArray([...q.options]) : q.options }));

      setQuiz(finalQuiz);
      setAttemptId(attemptData._id);
      setAttemptNumber(attemptData.attemptNumber || null);
      setStartTime(new Date());
      setQuestionStartTime(new Date());

      // Accurate remaining time (supports resume)
      const durationSec = (finalQuiz.settings.duration || 0) * 60;
      const startedAt = attemptData.startedAt ? new Date(attemptData.startedAt) : new Date();
      const elapsedSec = Math.max(0, Math.floor((Date.now() - startedAt.getTime()) / 1000));
      setTimeLeft(Math.max(0, durationSec - elapsedSec));

      // Join quiz room for real-time updates
      socketService.joinQuiz(quizId);

      setPhase('in-progress');
      toast('تم بدء الكويز. بالتوفيق!', 'success');
    } catch (error: any) {
      console.error('Error starting quiz:', error);
      const msg = error?.response?.data?.message || 'تعذر بدء الكويز';
      setAvailabilityMessage(msg);
      toast(msg, 'error');
    } finally {
      setStarting(false);
    }
  };

  // Leave room on unmount or when leaving in-progress
  useEffect(() => {
    return () => {
      if (quizId) socketService.leaveQuiz(quizId);
    };
  }, [quizId]);

  // Anti-cheat protections (only in-progress, not preview)
  useEffect(() => {
    if (isPreview || phase !== 'in-progress') return;

    const preventCheating = (e: Event) => {
      e.preventDefault();
      addCheatingWarning('محاولة نسخ/قص/لصق أو سحب المحتوى');
      return false;
    };

    const preventKeyboardShortcuts = (e: KeyboardEvent) => {
      if (
        (e.ctrlKey && ['c', 'v', 'a', 's', 'f', 'u'].includes(e.key.toLowerCase())) ||
        e.key === 'F12' ||
        (e.ctrlKey && e.shiftKey && (e.key.toLowerCase() === 'i' || e.key.toLowerCase() === 'j')) ||
        e.key.toLowerCase() === 'printscreen'
      ) {
        e.preventDefault();
        addCheatingWarning('محاولة استخدام اختصارات محظورة');
        return false;
      }
    };

    const preventRightClick = (e: MouseEvent) => {
      e.preventDefault();
      addCheatingWarning('محاولة الضغط بالزر الأيمن');
      return false;
    };

    // Visibility / focus detection
    const handleVisibilityChange = () => {
      if (document.hidden) {
        setIsWindowFocused(false);
        warningCountRef.current += 1;
        setTabSwitchCount((prev) => prev + 1);
        addCheatingWarning(`مغادرة التبويب أو النافذة (المرة ${warningCountRef.current})`);

        // Auto-submit after 3 warnings
        if (warningCountRef.current >= 3) {
          addCheatingWarning('إنهاء الكويز تلقائياً لمخالفة قواعد الامتحان');
          if (autoSubmitTimeoutRef.current) clearTimeout(autoSubmitTimeoutRef.current);
          autoSubmitTimeoutRef.current = setTimeout(() => {
            handleSubmitQuiz(true);
          }, 1500);
        }
      } else {
        setIsWindowFocused(true);
      }
    };

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = 'هل أنت متأكد من مغادرة الكويز؟ سيتم إرسال إجاباتك تلقائياً.';
      if (attemptId && !submitting) handleSubmitQuiz(true);
      return e.returnValue;
    };

    // Register listeners
    document.addEventListener('copy', preventCheating);
    document.addEventListener('paste', preventCheating);
    document.addEventListener('cut', preventCheating);
    document.addEventListener('dragstart', preventCheating);
    document.addEventListener('selectstart', preventCheating);
    document.addEventListener('keydown', preventKeyboardShortcuts);
    document.addEventListener('contextmenu', preventRightClick);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    // Disable text selection
    const prevUserSelect = document.body.style.userSelect;
    const prevWebkitUserSelect = (document.body.style as any).webkitUserSelect;
    document.body.style.userSelect = 'none';
    (document.body.style as any).webkitUserSelect = 'none';

    return () => {
      document.removeEventListener('copy', preventCheating);
      document.removeEventListener('paste', preventCheating);
      document.removeEventListener('cut', preventCheating);
      document.removeEventListener('dragstart', preventCheating);
      document.removeEventListener('selectstart', preventCheating);
      document.removeEventListener('keydown', preventKeyboardShortcuts);
      document.removeEventListener('contextmenu', preventRightClick);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      if (autoSubmitTimeoutRef.current) clearTimeout(autoSubmitTimeoutRef.current);
      // Restore
      document.body.style.userSelect = prevUserSelect;
      (document.body.style as any).webkitUserSelect = prevWebkitUserSelect;
    };
  }, [attemptId, submitting, isPreview, phase]);

  // Timer
  useEffect(() => {
    if (!startTime) return;
    if (timeLeft <= 0) {
      handleSubmitQuiz();
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        const next = prev - 1;
        if (next === 300 && !warningShown) {
          setWarningShown(true);
          toast('تبقى 5 دقائق فقط لإنهاء الكويز!');
        }
        return next;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, startTime, warningShown]);

  // Answer change handler (autosave socket + HTTP fallback)
  const handleAnswerChange = useCallback(
    async (answer: string | string[] | boolean) => {
      if (!quiz || !attemptId) return;

      const currentQuestion = quiz.questions[currentQuestionIndex];
      if (!currentQuestion) return;

      const timeSpent = Math.floor((Date.now() - questionStartTime.getTime()) / 1000);

      const answerData: Answer = {
        questionId: currentQuestion._id,
        answer,
        timeSpent,
      };

      setAnswers((prev) => ({ ...prev, [currentQuestion._id]: answerData }));

      if (!isPreview) {
        try {
          socketService.saveAnswer({ attemptId, questionId: currentQuestion._id, answer, timeSpent });
          await attemptsAPI.submitAnswer(attemptId, { questionId: currentQuestion._id, answer, timeSpent });
        } catch (error) {
          console.error('Error submitting answer:', error);
        }
      }
    },
    [quiz, attemptId, currentQuestionIndex, questionStartTime, isPreview]
  );

  const navigateToQuestion = (index: number) => {
    if (!quiz) return;
    if (index >= 0 && index < quiz.questions.length) {
      setCurrentQuestionIndex(index);
      setQuestionStartTime(new Date());
    }
  };

  const handleSubmitQuiz = async (isAutoSubmit: boolean = false) => {
    if (isPreview) {
      toast('هذه معاينة فقط');
      return;
    }
    if (!attemptId || submitting) return;

    setSubmitting(true);
    try {
      await attemptsAPI.complete(attemptId, {
        cheatingWarnings,
        tabSwitchCount,
        isAutoSubmit,
      });

      if (quiz?.settings.showAnswers === 'immediately') {
        router.push(`/results/${attemptId}`);
      } else {
        router.push('/results?success=true');
      }
    } catch (error: any) {
      console.error('Error submitting quiz:', error);
      toast(error?.response?.data?.message || 'حدث خطأ في إرسال الكويز', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const getQuestionStatus = (questionIndex: number) => {
    const question = quiz?.questions[questionIndex];
    if (!question) return 'unanswered';
    return answers[question._id] ? 'answered' : 'unanswered';
  };

  const attemptsLeft = quizInfo?.settings?.maxAttempts
    ? Math.max(0, (quizInfo.settings.maxAttempts || 0) - attemptsCount)
    : undefined;

  // Access control
  if (!user || (user.role !== 'student' && !isPreview)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">غير مصرح لك بالوصول</h1>
          <p className="text-gray-600">هذه الصفحة مخصصة للطلاب فقط</p>
        </div>
      </div>
    );
  }

  // Overview phase
  if (phase === 'overview') {
    if (loading) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mb-4"></div>
            <p className="text-gray-600">جاري تحميل معلومات الكويز...</p>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 py-10">
          <div className="bg-white rounded-xl shadow border p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{quizInfo?.title || 'الكويز'}</h1>
                {quizInfo?.description && <p className="text-gray-600 mt-1">{quizInfo.description}</p>}
              </div>
              <Button variant="outline" onClick={async () => {
                try {
                  if (document.fullscreenEnabled && !document.fullscreenElement) {
                    await document.documentElement.requestFullscreen();
                    toast('تم تفعيل وضع ملء الشاشة لبيئة أكثر أماناً', 'success');
                  }
                } catch {}
              }}>
                <Maximize2 className="h-4 w-4 mr-2" /> تفعيل ملء الشاشة
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mt-6">
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="text-sm text-gray-500">المدة</div>
                <div className="text-lg font-semibold text-gray-900">{quizInfo?.settings?.duration || 0} دقيقة</div>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="text-sm text-gray-500">عدد الأسئلة</div>
                <div className="text-lg font-semibold text-gray-900">{quizInfo?.questions?.length || 0}</div>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="text-sm text-gray-500">النقاط الكلية</div>
                <div className="text-lg font-semibold text-gray-900">{(quizInfo as any)?.totalPoints || 0}</div>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="text-sm text-gray-500">عدد المحاولات المتبقية</div>
                <div className="text-lg font-semibold text-gray-900">{attemptsLeft ?? '-'}</div>
              </div>
            </div>

            {/* Rules */}
            <div className="mt-8">
              <div className="flex items-center gap-2 mb-3">
                <Shield className="h-5 w-5 text-blue-600" />
                <h2 className="text-lg font-semibold text-gray-900">قواعد الحماية الصارمة</h2>
              </div>
              <ul className="space-y-2 text-gray-700">
                <li>١) يمنع النسخ واللصق والسحب واستخدام الزر الأيمن.</li>
                <li>٢) يمنع استخدام الاختصارات المحظورة أو أدوات المطور.</li>
                <li>٣) مغادرة التبويب أكثر من 3 مرات يؤدي للإرسال التلقائي.</li>
                <li>٤) الوقت لا يتوقف عند الخروج، وسيتم الحفظ تلقائياً.</li>
                <li>٥) يُنصح باستخدام وضع ملء الشاشة لتجربة أكثر أماناً.</li>
              </ul>
            </div>

            {availabilityMessage && (
              <div className="mt-6 p-3 rounded-lg bg-yellow-50 text-yellow-800 border border-yellow-200">
                <div className="flex items-center gap-2"><AlertTriangle className="h-4 w-4" />{availabilityMessage}</div>
              </div>
            )}

            <div className="mt-6 flex gap-3">
              <Button onClick={handleStart} loading={starting}>بدء الكويز</Button>
              <Button variant="outline" onClick={() => router.push('/quizzes')}>عودة</Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // In-progress phase UI
  if (loading || !quiz) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600">جاري تحضير الكويز...</p>
        </div>
      </div>
    );
  }

  const currentQuestion = quiz.questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / quiz.questions.length) * 100;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header with Timer */}
      <div className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900">{quiz.title}</h1>
              <p className="text-sm text-gray-600">السؤال {currentQuestionIndex + 1} من {quiz.questions.length} {attemptNumber ? `· المحاولة رقم ${attemptNumber}` : ''}</p>
            </div>

            <div className="flex items-center gap-4">
              <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${timeLeft <= 300 ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                <Clock className="h-5 w-5" />
                <span className="font-mono text-lg font-bold">{formatTime(timeLeft)}</span>
              </div>

              <Button onClick={() => handleSubmitQuiz()} loading={submitting} disabled={submitting} variant="primary">إنهاء الكويز</Button>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mt-4">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-blue-600 h-2 rounded-full transition-all duration-300" style={{ width: `${progress}%` }}></div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Question Navigation Sidebar */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">خريطة الأسئلة</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-5 gap-2">
                  {quiz.questions.map((q, index) => {
                    const status = getQuestionStatus(index);
                    return (
                      <button
                        key={q._id}
                        onClick={() => navigateToQuestion(index)}
                        className={`w-8 h-8 rounded text-sm font-medium transition-all duration-200 ${
                          index === currentQuestionIndex
                            ? 'bg-blue-600 text-white ring-2 ring-blue-300'
                            : status === 'answered'
                            ? 'bg-green-100 text-green-700 hover:bg-green-200'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                        title={`سؤال ${index + 1}`}
                      >
                        {index + 1}
                      </button>
                    );
                  })}
                </div>

                <div className="mt-4 space-y-2 text-sm">
                  <div className="flex items-center gap-2"><div className="w-3 h-3 bg-green-100 rounded"></div><span className="text-gray-600">تم الإجابة</span></div>
                  <div className="flex items-center gap-2"><div className="w-3 h-3 bg-gray-100 rounded"></div><span className="text-gray-600">لم يتم الإجابة</span></div>
                  <div className="flex items-center gap-2"><div className="w-3 h-3 bg-blue-600 rounded"></div><span className="text-gray-600">السؤال الحالي</span></div>
                </div>

                {/* Anti-cheat indicators */}
                <div className="mt-6 text-xs text-gray-500">
                  <div className="flex items-center gap-2"><AlertTriangle className="h-3 w-3" /> تحذيرات: {tabSwitchCount}</div>
                  <div className="mt-1">التركيز: {isWindowFocused ? 'داخل الصفحة' : 'خارج الصفحة'}</div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Question Area */}
          <div className="lg:col-span-3">
            <Card className="mb-6">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">السؤال {currentQuestionIndex + 1}</CardTitle>
                  <span className="text-sm text-gray-600">{currentQuestion.points} نقطة</span>
                </div>
              </CardHeader>

              <CardContent>
                <div className="space-y-6">
                  {/* Question Text */}
                  <div className="text-lg leading-relaxed text-gray-900">
                    {currentQuestion?.content || 'جاري تحميل السؤال...'}
                  </div>

                  {/* Answer Options */}
                  <div className="space-y-3">
                    {currentQuestion?.answerType === 'single-choice' && currentQuestion?.options && (
                      <div className="space-y-3">
                        {currentQuestion.options.map((option, idx) => (
                          <label key={option._id || `opt-${idx}`} className="flex items-center p-4 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                            <input
                              type="radio"
                              name={`question-${currentQuestion._id}`}
                              value={option._id}
                              checked={answers[currentQuestion._id]?.answer === option._id}
                              onChange={(e) => handleAnswerChange(e.target.value)}
                              className="mr-3"
                            />
                            <span className="flex-1 text-gray-900">{option.text}</span>
                          </label>
                        ))}
                      </div>
                    )}

                    {currentQuestion?.answerType === 'multiple-choice' && currentQuestion?.options && (
                      <div className="space-y-3">
                        {currentQuestion.options.map((option, idx) => (
                          <label key={option._id || `opt-${idx}`} className="flex items-center p-4 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                            <input
                              type="checkbox"
                              name={`question-${currentQuestion._id}`}
                              value={option._id}
                              checked={Array.isArray(answers[currentQuestion._id]?.answer) && (answers[currentQuestion._id]?.answer as string[]).includes(option._id)}
                              onChange={() => {
                                const prev = (answers[currentQuestion._id]?.answer as string[]) || [];
                                const val = option._id;
                                const next = prev.includes(val) ? prev.filter((v) => v !== val) : [...prev, val];
                                handleAnswerChange(next);
                              }}
                              className="mr-3"
                            />
                            <span className="flex-1 text-gray-900">{option.text}</span>
                          </label>
                        ))}
                      </div>
                    )}

                    {currentQuestion?.answerType === 'image-selection' && currentQuestion?.options && (
                      <div className="space-y-3">
                        {currentQuestion.options.map((option, idx) => (
                          <label key={option._id || `opt-${idx}`} className="flex items-center p-4 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                            <input
                              type="radio"
                              name={`question-${currentQuestion._id}`}
                              value={option._id}
                              checked={answers[currentQuestion._id]?.answer === option._id}
                              onChange={(e) => handleAnswerChange(e.target.value)}
                              className="mr-3"
                            />
                            {option.imageUrl && <img src={option.imageUrl} alt={option.text} className="w-20 h-20 object-cover rounded" />}
                            <span className="flex-1 text-gray-900 ml-3">{option.text}</span>
                          </label>
                        ))}
                      </div>
                    )}

                    {currentQuestion?.answerType === 'text-answer' && (
                      <textarea
                        className="w-full p-4 border border-gray-200 rounded-lg resize-none"
                        rows={4}
                        placeholder="اكتب إجابتك هنا..."
                        value={(answers[currentQuestion._id]?.answer as string) || ''}
                        onChange={(e) => handleAnswerChange(e.target.value)}
                      />
                    )}

                    {currentQuestion?.answerType === 'true-false' && (
                      <div className="space-y-3">
                        <label className="flex items-center p-4 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                          <input
                            type="radio"
                            name={`question-${currentQuestion._id}`}
                            value="true"
                            checked={answers[currentQuestion._id]?.answer === true}
                            onChange={() => handleAnswerChange(true)}
                            className="mr-3"
                          />
                          <span className="flex-1 text-gray-900">صحيح</span>
                        </label>
                        <label className="flex items-center p-4 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                          <input
                            type="radio"
                            name={`question-${currentQuestion._id}`}
                            value="false"
                            checked={answers[currentQuestion._id]?.answer === false}
                            onChange={() => handleAnswerChange(false)}
                            className="mr-3"
                          />
                          <span className="flex-1 text-gray-900">خطأ</span>
                        </label>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Navigation Buttons */}
            <div className="flex justify-between items-center">
              <Button variant="outline" onClick={() => navigateToQuestion(currentQuestionIndex - 1)} disabled={currentQuestionIndex === 0}>
                <ChevronRight className="h-4 w-4 ml-2" /> السؤال السابق
              </Button>

              <div className="text-sm text-gray-600">
                {Object.keys(answers).length} من {quiz.questions.length} تم الإجابة عليها
              </div>

              <Button onClick={() => navigateToQuestion(currentQuestionIndex + 1)} disabled={currentQuestionIndex === quiz.questions.length - 1}>
                السؤال التالي <ChevronLeft className="h-4 w-4 mr-2" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuizTakingPage;