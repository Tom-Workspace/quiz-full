'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { quizzesAPI } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { CheckCircle, Plus, Trash2, GripVertical, RotateCcw } from 'lucide-react';

export type BuilderQuestionType = 'text' | 'image' | 'audio';
export type BuilderAnswerType = 'single-choice' | 'multiple-choice' | 'image-selection' | 'text-answer' | 'true-false';

export interface BuilderOption {
  text?: string;
  imageUrl?: string;
  isCorrect?: boolean;
}

export interface BuilderQuestion {
  _tempId: string; // local key
  type: BuilderQuestionType;
  content: string;
  mediaUrl?: string;
  answerType: BuilderAnswerType;
  options?: BuilderOption[];
  correctAnswer?: string;
  correctBoolean?: boolean;
  points: number;
  timeLimit?: number;
}

export interface BuilderQuiz {
  title: string;
  description?: string;
  isActive: boolean;
  questions: BuilderQuestion[];
  settings: {
    startDate: string; // ISO or local datetime string
    endDate: string;   // ISO or local datetime string
    duration: number;  // minutes
    maxAttempts: number;
    showAnswers: 'immediately' | 'after-quiz-ends' | 'never';
    showScore: 'immediately' | 'after-quiz-ends' | 'never';
    allowResume: boolean;
    shuffleQuestions: boolean;
    shuffleOptions: boolean;
  };
}

interface Props {
  mode: 'create' | 'edit';
  quizId?: string; // required in edit mode
  initialQuiz?: any; // backend quiz shape, optional when editing
}

const defaultQuestion = (): BuilderQuestion => ({
  _tempId: Math.random().toString(36).slice(2),
  type: 'text',
  content: '',
  answerType: 'single-choice',
  options: [
    { text: 'خيار 1', isCorrect: true },
    { text: 'خيار 2', isCorrect: false }
  ],
  points: 1,
  timeLimit: 60
});

const defaultQuiz = (): BuilderQuiz => ({
  title: '',
  description: '',
  isActive: false,
  questions: [defaultQuestion()],
  settings: {
    startDate: new Date(Date.now() + 5 * 60 * 1000).toISOString().slice(0, 16),
    endDate: new Date(Date.now() + 65 * 60 * 1000).toISOString().slice(0, 16),
    duration: 60,
    maxAttempts: 1,
    showAnswers: 'after-quiz-ends',
    showScore: 'immediately',
    allowResume: true,
    shuffleQuestions: false,
    shuffleOptions: false
  }
});

const QuizBuilder: React.FC<Props> = ({ mode, quizId, initialQuiz }) => {
  const router = useRouter();
  const [quiz, setQuiz] = useState<BuilderQuiz>(defaultQuiz());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Load initial quiz in edit mode
  useEffect(() => {
    if (mode === 'edit' && initialQuiz) {
      // Map backend quiz to builder state shape
      const mapped: BuilderQuiz = {
        title: initialQuiz.title || '',
        description: initialQuiz.description || '',
        isActive: !!initialQuiz.isActive,
        questions: (initialQuiz.questions || []).map((q: any) => ({
          _tempId: Math.random().toString(36).slice(2),
          type: q.type,
          content: q.content,
          mediaUrl: q.mediaUrl,
          answerType: q.answerType,
          options: q.options,
          correctAnswer: q.correctAnswer,
          correctBoolean: q.correctBoolean,
          points: q.points ?? 1,
          timeLimit: q.timeLimit ?? 60
        })),
        settings: {
          startDate: (initialQuiz.settings?.startDate ? new Date(initialQuiz.settings.startDate) : new Date()).toISOString().slice(0, 16),
          endDate: (initialQuiz.settings?.endDate ? new Date(initialQuiz.settings.endDate) : new Date(Date.now() + 60 * 60 * 1000)).toISOString().slice(0, 16),
          duration: initialQuiz.settings?.duration ?? 60,
          maxAttempts: initialQuiz.settings?.maxAttempts ?? 1,
          showAnswers: initialQuiz.settings?.showAnswers ?? 'after-quiz-ends',
          showScore: initialQuiz.settings?.showScore ?? 'immediately',
          allowResume: !!initialQuiz.settings?.allowResume,
          shuffleQuestions: !!initialQuiz.settings?.shuffleQuestions,
          shuffleOptions: !!initialQuiz.settings?.shuffleOptions,
        }
      };
      setQuiz(mapped);
    }
  }, [mode, initialQuiz]);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    const div = document.createElement('div');
    div.className = `fixed top-4 right-4 px-4 py-3 rounded-lg z-50 ${
      type === 'success' ? 'bg-green-100 border border-green-200 text-green-700' 
      : 'bg-red-100 border border-red-200 text-red-700'
    }`;
    div.textContent = message;
    document.body.appendChild(div);
    setTimeout(() => document.body.removeChild(div), 3000);
  };

  const updateQuestion = (idx: number, patch: Partial<BuilderQuestion>) => {
    setQuiz(prev => {
      const next = { ...prev };
      next.questions = [...prev.questions];
      next.questions[idx] = { ...prev.questions[idx], ...patch } as BuilderQuestion;
      // If switching answerType, reset appropriate fields
      const q = next.questions[idx];
      if (patch.answerType) {
        if (patch.answerType === 'text-answer') {
          q.options = undefined;
          q.correctBoolean = undefined;
          q.correctAnswer = q.correctAnswer || '';
        } else if (patch.answerType === 'true-false') {
          q.options = undefined;
          q.correctAnswer = undefined;
          q.correctBoolean = typeof q.correctBoolean === 'boolean' ? q.correctBoolean : true;
        } else {
          // choice-based
          q.correctAnswer = undefined;
          q.correctBoolean = undefined;
          q.options = q.options && q.options.length ? q.options : [
            { text: 'خيار 1', isCorrect: true },
            { text: 'خيار 2', isCorrect: false }
          ];
        }
      }
      return next;
    });
  };

  const addQuestion = () => {
    setQuiz(prev => ({ ...prev, questions: [...prev.questions, defaultQuestion()] }));
  };

  const removeQuestion = (idx: number) => {
    setQuiz(prev => ({ ...prev, questions: prev.questions.filter((_, i) => i !== idx) }));
  };

  // Drag and drop reorder (HTML5)
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const onDragStart = (index: number) => setDragIndex(index);
  const onDragOver = (e: React.DragEvent<HTMLDivElement>) => e.preventDefault();
  const onDrop = (index: number) => {
    setQuiz(prev => {
      if (dragIndex === null || dragIndex === index) return prev;
      const reordered = [...prev.questions];
      const [moved] = reordered.splice(dragIndex, 1);
      reordered.splice(index, 0, moved);
      return { ...prev, questions: reordered };
    });
    setDragIndex(null);
  };

  const validateQuiz = (qz: BuilderQuiz): string[] => {
    const errors: string[] = [];
    if (!qz.title.trim()) errors.push('عنوان الكويز مطلوب');
    if (!qz.settings.startDate || !qz.settings.endDate) errors.push('تاريخ البداية والنهاية مطلوبان');
    const start = new Date(qz.settings.startDate);
    const end = new Date(qz.settings.endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) errors.push('تواريخ غير صالحة');
    if (end <= start) errors.push('نهاية الكويز يجب أن تكون بعد البداية');
    if (qz.settings.duration < 1) errors.push('المدة يجب ألا تقل عن دقيقة');

    if (qz.questions.length < 1) errors.push('يجب إضافة سؤال واحد على الأقل');
    qz.questions.forEach((q, i) => {
      if (!q.content.trim()) errors.push(`محتوى السؤال #${i + 1} مطلوب`);
      if ((q.type === 'image' || q.type === 'audio') && !q.mediaUrl) errors.push(`رابط الوسائط مطلوب للسؤال #${i + 1}`);
      if (q.points < 0) errors.push(`النقاط لا يجب أن تكون سالبة (سؤال #${i + 1})`);
      if ((q.timeLimit ?? 60) < 10) errors.push(`الحد الأدنى للوقت 10 ثواني (سؤال #${i + 1})`);

      if (q.answerType === 'text-answer') {
        if (!q.correctAnswer || !q.correctAnswer.trim()) errors.push(`الإجابة الصحيحة مطلوبة (سؤال #${i + 1})`);
      } else if (q.answerType === 'true-false') {
        if (typeof q.correctBoolean !== 'boolean') errors.push(`حدد صحيح/خطأ (سؤال #${i + 1})`);
      } else {
        const opts = q.options || [];
        if (opts.length < 2) errors.push(`أضف خيارين على الأقل (سؤال #${i + 1})`);
        const correctCount = opts.filter(o => o.isCorrect).length;
        if (q.answerType === 'single-choice' || q.answerType === 'image-selection') {
          if (correctCount !== 1) errors.push(`يجب اختيار إجابة صحيحة واحدة (سؤال #${i + 1})`);
        }
        if (q.answerType === 'multiple-choice' && correctCount < 1) {
          errors.push(`حدد خياراً صحيحاً واحداً على الأقل (سؤال #${i + 1})`);
        }
      }
    });

    return errors;
  };

  const toBackendPayload = (qz: BuilderQuiz) => ({
    title: qz.title.trim(),
    description: qz.description?.trim(),
    isActive: qz.isActive,
    questions: qz.questions.map(q => ({
      type: q.type,
      content: q.content,
      mediaUrl: q.mediaUrl,
      answerType: q.answerType,
      options: q.answerType === 'text-answer' || q.answerType === 'true-false' ? undefined : q.options?.map(o => ({
        text: o.text,
        imageUrl: o.imageUrl,
        isCorrect: !!o.isCorrect
      })),
      correctAnswer: q.answerType === 'text-answer' ? (q.correctAnswer || '') : undefined,
      correctBoolean: q.answerType === 'true-false' ? !!q.correctBoolean : undefined,
      points: q.points,
      timeLimit: q.timeLimit
    })),
    settings: {
      ...qz.settings,
      startDate: new Date(qz.settings.startDate).toISOString(),
      endDate: new Date(qz.settings.endDate).toISOString()
    }
  });

  const saveQuiz = async (publish: boolean) => {
    try {
      setSaving(true);
      setError('');
      setSuccess('');

      const working = { ...quiz, isActive: publish };
      const errs = validateQuiz(working);
      if (errs.length) {
        setError(errs[0]);
        showToast(errs[0], 'error');
        return;
      }

      const payload = toBackendPayload(working);
      if (mode === 'create') {
        const res = await quizzesAPI.create(payload);
        setSuccess('تم إنشاء الكويز بنجاح');
        showToast('تم إنشاء الكويز');
        router.push(`/admin/quizzes/${res.data.data?.quiz?._id || ''}/edit`);
      } else if (mode === 'edit' && quizId) {
        await quizzesAPI.update(quizId, payload);
        setSuccess('تم حفظ التعديلات');
        showToast('تم حفظ التعديلات');
      }
    } catch (e: any) {
      console.error('Save quiz error', e);
      const msg = e?.response?.data?.message || 'تعذر حفظ الكويز';
      setError(msg);
      showToast(msg, 'error');
    } finally {
      setSaving(false);
    }
  };

  const resetToDefault = () => setQuiz(defaultQuiz());

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-3">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          {mode === 'create' ? 'إنشاء كويز جديد' : 'تعديل الكويز'}
        </h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={resetToDefault}>
            <RotateCcw className="h-4 w-4 mr-2" /> إعادة الضبط
          </Button>
          <Button variant="outline" onClick={() => saveQuiz(false)} loading={saving}>حفظ كمسودة</Button>
          <Button onClick={() => saveQuiz(true)} loading={saving}>نشر الكويز</Button>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-md bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800">
          {error}
        </div>
      )}

      {/* Quiz Info */}
      <Card>
        <CardHeader>
          <CardTitle>معلومات الكويز</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">العنوان</label>
            <Input value={quiz.title} onChange={(e) => setQuiz({ ...quiz, title: e.target.value })} placeholder="عنوان الكويز" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">الوصف</label>
            <textarea className="w-full  p-2 border rounded-md dark:bg-white dark:border-gray-700" value={quiz.description} onChange={(e) => setQuiz({ ...quiz, description: e.target.value })} placeholder="وصف مختصر" />
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="isActive" checked={quiz.isActive} onChange={(e) => setQuiz({ ...quiz, isActive: e.target.checked })} />
            <label htmlFor="isActive">تفعيل الكويز</label>
          </div>
        </CardContent>
      </Card>

      {/* Settings */}
      <Card>
        <CardHeader>
          <CardTitle>الإعدادات</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">تاريخ البداية</label>
            <Input type="datetime-local" value={quiz.settings.startDate} onChange={(e) => setQuiz({ ...quiz, settings: { ...quiz.settings, startDate: e.target.value } })} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">تاريخ النهاية</label>
            <Input type="datetime-local" value={quiz.settings.endDate} onChange={(e) => setQuiz({ ...quiz, settings: { ...quiz.settings, endDate: e.target.value } })} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">المدة (دقائق)</label>
            <Input type="number" min={1} value={quiz.settings.duration} onChange={(e) => setQuiz({ ...quiz, settings: { ...quiz.settings, duration: parseInt(e.target.value || '0') } })} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">أقصى محاولات</label>
            <Input type="number" min={1} value={quiz.settings.maxAttempts} onChange={(e) => setQuiz({ ...quiz, settings: { ...quiz.settings, maxAttempts: parseInt(e.target.value || '1') } })} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">عرض الإجابات</label>
            <select className="w-full p-2 border rounded-md dark:border-gray-700" value={quiz.settings.showAnswers} onChange={(e) => setQuiz({ ...quiz, settings: { ...quiz.settings, showAnswers: e.target.value as any } })}>
              <option value="immediately">فوراً</option>
              <option value="after-quiz-ends">بعد انتهاء الكويز</option>
              <option value="never">لا يظهر</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">عرض الدرجة</label>
            <select className="w-full p-2 border rounded-md dark:border-gray-700" value={quiz.settings.showScore} onChange={(e) => setQuiz({ ...quiz, settings: { ...quiz.settings, showScore: e.target.value as any } })}>
              <option value="immediately">فوراً</option>
              <option value="after-quiz-ends">بعد انتهاء الكويز</option>
              <option value="never">لا يظهر</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="allowResume" checked={quiz.settings.allowResume} onChange={(e) => setQuiz({ ...quiz, settings: { ...quiz.settings, allowResume: e.target.checked } })} />
            <label htmlFor="allowResume">السماح بالاستئناف</label>
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="shuffleQ" checked={quiz.settings.shuffleQuestions} onChange={(e) => setQuiz({ ...quiz, settings: { ...quiz.settings, shuffleQuestions: e.target.checked } })} />
            <label htmlFor="shuffleQ">خلط الأسئلة</label>
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="shuffleO" checked={quiz.settings.shuffleOptions} onChange={(e) => setQuiz({ ...quiz, settings: { ...quiz.settings, shuffleOptions: e.target.checked } })} />
            <label htmlFor="shuffleO">خلط الخيارات</label>
          </div>
        </CardContent>
      </Card>

      {/* Questions List */}
      <Card>
        <CardHeader className="flex items-center justify-between">
          <CardTitle>الأسئلة</CardTitle>
          <Button onClick={addQuestion}><Plus className="h-4 w-4 mr-2" /> إضافة سؤال</Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {quiz.questions.map((q, idx) => (
            <div
              key={q._tempId}
              className="border rounded-lg p-4 dark:border-gray-700"
              draggable
              onDragStart={() => onDragStart(idx)}
              onDragOver={onDragOver}
              onDrop={() => onDrop(idx)}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 text-gray-500">
                  <GripVertical className="h-4 w-4" />
                  <span className="text-sm">سؤال #{idx + 1}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="danger" size="sm" onClick={() => removeQuestion(idx)}>
                    <Trash2 className="h-4 w-4 mr-1" /> حذف
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">نوع السؤال</label>
                  <select className="w-full p-2 border rounded-md  dark:border-gray-700" value={q.type} onChange={(e) => updateQuestion(idx, { type: e.target.value as BuilderQuestionType })}>
                    <option value="text">نصي</option>
                    <option value="image">صورة</option>
                    <option value="audio">صوت</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">طريقة الإجابة</label>
                  <select className="w-full p-2 border rounded-md  dark:border-gray-700" value={q.answerType} onChange={(e) => updateQuestion(idx, { answerType: e.target.value as BuilderAnswerType })}>
                    <option value="single-choice">اختيار واحد</option>
                    <option value="multiple-choice">اختيارات متعددة</option>
                    <option value="image-selection">اختيار صورة</option>
                    <option value="text-answer">إجابة نصية</option>
                    <option value="true-false">صح / خطأ</option>
                  </select>
                </div>
              </div>

              <div className="mt-3">
                <label className="block text-sm font-medium mb-1">نص السؤال</label>
                <textarea className="w-full p-2 border rounded-md  dark:border-gray-700" value={q.content} onChange={(e) => updateQuestion(idx, { content: e.target.value })} placeholder="اكتب نص السؤال" />
              </div>

              {(q.type === 'image' || q.type === 'audio') && (
                <div className="mt-3">
                  <label className="block text-sm font-medium mb-1">رابط الوسائط</label>
                  <Input value={q.mediaUrl || ''} onChange={(e) => updateQuestion(idx, { mediaUrl: e.target.value })} placeholder="https://example.com/file" />
                </div>
              )}

              {/* Answer Area */}
              <div className="mt-4">
                {q.answerType === 'text-answer' && (
                  <div>
                    <label className="block text-sm font-medium mb-1">الإجابة الصحيحة</label>
                    <Input value={q.correctAnswer || ''} onChange={(e) => updateQuestion(idx, { correctAnswer: e.target.value })} placeholder="الإجابة الصحيحة" />
                  </div>
                )}

                {q.answerType === 'true-false' && (
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2">
                      <input type="radio" name={`tf-${q._tempId}`} checked={q.correctBoolean === true} onChange={() => updateQuestion(idx, { correctBoolean: true })} />
                      <span>صحيح</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input type="radio" name={`tf-${q._tempId}`} checked={q.correctBoolean === false} onChange={() => updateQuestion(idx, { correctBoolean: false })} />
                      <span>خطأ</span>
                    </label>
                  </div>
                )}

                {['single-choice', 'multiple-choice', 'image-selection'].includes(q.answerType) && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="block text-sm font-medium">الخيارات</label>
                      <Button size="sm" onClick={() => {
                        const nextOpts = [...(q.options || [])];
                        nextOpts.push({ text: `خيار ${nextOpts.length + 1}`, isCorrect: false });
                        updateQuestion(idx, { options: nextOpts });
                      }}>
                        <Plus className="h-4 w-4 mr-1" /> إضافة خيار
                      </Button>
                    </div>

                    {(q.options || []).map((opt, oi) => (
                      <div key={oi} className="p-2 border rounded-md flex items-center gap-2 dark:border-gray-700">
                        <input
                          type="checkbox"
                          checked={!!opt.isCorrect}
                          onChange={(e) => {
                            const next = [...(q.options || [])];
                            // if single choice/image-selection enforce single correct
                            if (q.answerType === 'single-choice' || q.answerType === 'image-selection') {
                              next.forEach((o, idx2) => { o.isCorrect = (idx2 === oi) ? e.target.checked : false; });
                            } else {
                              next[oi].isCorrect = e.target.checked;
                            }
                            updateQuestion(idx, { options: next });
                          }}
                          title="صحيح؟"
                        />
                        <Input
                          value={opt.text || ''}
                          onChange={(e) => {
                            const next = [...(q.options || [])];
                            next[oi].text = e.target.value;
                            updateQuestion(idx, { options: next });
                          }}
                          placeholder={`نص الخيار ${oi + 1}`}
                        />
                        {q.answerType === 'image-selection' && (
                          <Input
                            value={opt.imageUrl || ''}
                            onChange={(e) => {
                              const next = [...(q.options || [])];
                              next[oi].imageUrl = e.target.value;
                              updateQuestion(idx, { options: next });
                            }}
                            placeholder="رابط الصورة"
                          />
                        )}
                        <Button variant="danger" size="sm" onClick={() => {
                          const next = [...(q.options || [])];
                          next.splice(oi, 1);
                          updateQuestion(idx, { options: next });
                        }}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                <div>
                  <label className="block text-sm font-medium mb-1">النقاط</label>
                  <Input type="number" min={0} value={q.points} onChange={(e) => updateQuestion(idx, { points: parseInt(e.target.value || '0') })} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">الوقت (ثانية)</label>
                  <Input type="number" min={10} value={q.timeLimit ?? 60} onChange={(e) => updateQuestion(idx, { timeLimit: parseInt(e.target.value || '60') })} />
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Live Preview (simple) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><CheckCircle className="h-5 w-5 text-green-600" />معاينة سريعة</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-gray-600 dark:text-gray-300">العنوان: {quiz.title || '—'}</div>
          <div className="text-sm text-gray-600 dark:text-gray-300">عدد الأسئلة: {quiz.questions.length}</div>
          <div className="text-sm text-gray-600 dark:text-gray-300">المدة: {quiz.settings.duration} دقيقة</div>
          <div className="text-sm text-gray-600 dark:text-gray-300">نشط: {quiz.isActive ? 'نعم' : 'لا'}</div>
        </CardContent>
      </Card>
    </div>
  );
};

export default QuizBuilder;
