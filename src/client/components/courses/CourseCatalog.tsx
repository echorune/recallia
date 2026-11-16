import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { EnrollmentStatus } from '../../../core/types';
import { EnrollmentStateMachine } from '../../../core/enrollment/stateMachine';
import { 
  BookOpen, Layers, CheckCircle2, PauseCircle, PlayCircle, 
  Award, LogOut, Plus, AlertCircle, Sparkles, ChevronRight, X, Shield 
} from 'lucide-react';

interface CourseItem {
  id: string;
  code: string;
  title: string;
  description: string;
  color: string;
  isPublic: boolean;
  enrollmentStatus: EnrollmentStatus | null;
  enrolledAt: string | null;
  subjectCount: number;
  topicCount: number;
  cardCount: number;
}

interface CourseCatalogProps {
  onSelectCourse?: (courseId: string) => void;
}

export const CourseCatalog: React.FC<CourseCatalogProps> = ({ onSelectCourse }) => {
  const { token } = useAuth();
  const [courses, setCourses] = useState<CourseItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [isTransitioning, setIsTransitioning] = useState<string | null>(null);

  // Create course modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newCode, setNewCode] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newColor, setNewColor] = useState('#0F4C5C');
  const [isCreating, setIsCreating] = useState(false);

  const fetchCourses = async () => {
    try {
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const res = await fetch('/api/courses', { headers });
      const data = await res.json();
      if (data.courses) {
        setCourses(data.courses);
      }
    } catch (err) {
      console.error('Error fetching courses:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCourses();
  }, [token]);

  const handleEnrollmentTransition = async (courseId: string, targetStatus: EnrollmentStatus) => {
    setIsTransitioning(courseId);
    setActionError(null);
    setActionSuccess(null);
    try {
      const res = await fetch(`/api/courses/${courseId}/status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ status: targetStatus }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update enrollment status.');
      }

      setActionSuccess(data.message || `Status successfully changed to ${targetStatus}.`);
      await fetchCourses();
    } catch (err: any) {
      setActionError(err.message);
    } finally {
      setIsTransitioning(null);
    }
  };

  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCode || !newTitle) return;
    setIsCreating(true);
    setActionError(null);
    try {
      const res = await fetch('/api/courses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          code: newCode,
          title: newTitle,
          description: newDesc,
          color: newColor,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create course.');
      }

      setShowCreateModal(false);
      setNewCode('');
      setNewTitle('');
      setNewDesc('');
      setActionSuccess(`Course '${newTitle}' created and enrolled!`);
      await fetchCourses();
    } catch (err: any) {
      setActionError(err.message);
    } finally {
      setIsCreating(false);
    }
  };

  const getStatusBadge = (status: EnrollmentStatus | null) => {
    switch (status) {
      case 'enrolled':
        return (
          <span className="inline-flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Enrolled (Active)</span>
          </span>
        );
      case 'paused':
        return (
          <span className="inline-flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
            <PauseCircle className="w-3.5 h-3.5 text-amber-600" />
            <span>Studies Paused</span>
          </span>
        );
      case 'completed':
        return (
          <span className="inline-flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-bold bg-sky-100 text-sky-800 border border-sky-200">
            <Award className="w-3.5 h-3.5 text-sky-600" />
            <span>Course Completed</span>
          </span>
        );
      case 'withdrawn':
        return (
          <span className="inline-flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-300">
            <LogOut className="w-3.5 h-3.5 text-slate-500" />
            <span>Withdrawn</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-medium bg-slate-50 text-slate-500 border border-slate-200">
            <span>Not Enrolled</span>
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header with Title and Create Action */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center space-x-2">
            <BookOpen className="w-6 h-6 text-brand-teal" />
            <span>Course Catalog & Enrollments</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Manage your enrolled curricula. Enrollment status changes strictly preserve all historical review cards and SM-2 progress.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm text-white bg-brand-teal hover:bg-brand-navy shadow-soft transition-colors flex items-center space-x-2"
        >
          <Plus className="w-4 h-4" />
          <span>New Course</span>
        </button>
      </div>

      {/* Action Messages */}
      {actionSuccess && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs sm:text-sm font-medium flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{actionSuccess}</span>
          </div>
          <button onClick={() => setActionSuccess(null)} className="text-emerald-700 hover:text-emerald-900">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {actionError && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs sm:text-sm font-medium flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{actionError}</span>
          </div>
          <button onClick={() => setActionError(null)} className="text-red-700 hover:text-red-900">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* History Preservation Reassurance Banner */}
      <div className="p-4 rounded-2xl bg-brand-sage/15 border border-brand-sage/30 flex items-start space-x-3 text-xs text-brand-navy">
        <Shield className="w-4 h-4 text-brand-teal shrink-0 mt-0.5" />
        <div>
          <span className="font-bold">Learning History Guarantee:</span> Pausing or withdrawing from a course retains every review log, repetition count, and calculated ease factor. When you re-enroll or resume, your cards return exactly where you left off.
        </div>
      </div>

      {/* Courses List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {courses.map((course) => {
          const availableActions = EnrollmentStateMachine.getAvailableTransitions(course.enrollmentStatus);
          const isCurrentTransitioning = isTransitioning === course.id;

          return (
            <div
              key={course.id}
              className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-soft hover:shadow-elevated transition-all duration-200 flex flex-col justify-between"
            >
              <div>
                <div className="flex justify-between items-start gap-3 mb-4">
                  <div className="flex items-center space-x-2">
                    <span
                      className="px-2.5 py-0.5 rounded-lg text-xs font-bold text-white uppercase tracking-wider"
                      style={{ backgroundColor: course.color || '#0F4C5C' }}
                    >
                      {course.code}
                    </span>
                    <span className="text-xs text-slate-400">
                      {course.isPublic ? 'Public Course' : 'Custom'}
                    </span>
                  </div>
                  {getStatusBadge(course.enrollmentStatus)}
                </div>

                <h3 className="text-lg font-bold text-slate-900 mb-2 leading-snug">
                  {course.title}
                </h3>
                <p className="text-xs text-slate-600 mb-6 leading-relaxed line-clamp-2">
                  {course.description || 'Comprehensive spaced-repetition curriculum.'}
                </p>

                {/* Metrics */}
                <div className="grid grid-cols-3 gap-2 p-3 bg-slate-50 rounded-xl mb-6 text-center">
                  <div>
                    <div className="text-sm font-extrabold text-slate-800">{course.subjectCount}</div>
                    <div className="text-[10px] uppercase font-semibold text-slate-400">Subjects</div>
                  </div>
                  <div>
                    <div className="text-sm font-extrabold text-slate-800">{course.topicCount}</div>
                    <div className="text-[10px] uppercase font-semibold text-slate-400">Topics</div>
                  </div>
                  <div>
                    <div className="text-sm font-extrabold text-brand-emerald">{course.cardCount}</div>
                    <div className="text-[10px] uppercase font-semibold text-slate-400">Questions</div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
                {onSelectCourse && (
                  <button
                    onClick={() => onSelectCourse(course.id)}
                    className="text-xs font-bold text-brand-teal hover:underline flex items-center space-x-1"
                  >
                    <span>View Topics</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                )}

                <div className="flex flex-wrap gap-2 ml-auto">
                  {availableActions.map((target) => (
                    <button
                      key={target}
                      disabled={isCurrentTransitioning}
                      onClick={() => handleEnrollmentTransition(course.id, target)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all disabled:opacity-50 ${
                        target === 'enrolled'
                          ? 'bg-brand-emerald text-white hover:bg-teal-700 shadow-xs'
                          : target === 'paused'
                          ? 'bg-amber-100 text-amber-900 hover:bg-amber-200'
                          : target === 'completed'
                          ? 'bg-sky-100 text-sky-900 hover:bg-sky-200'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {isCurrentTransitioning ? 'Updating...' : EnrollmentStateMachine.getActionLabel(target)}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal: Create Course */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-8 shadow-elevated border border-slate-200 relative">
            <button
              onClick={() => setShowCreateModal(false)}
              className="absolute top-6 right-6 text-slate-400 hover:text-slate-600"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-xl font-bold text-slate-900 mb-1 flex items-center space-x-2">
              <BookOpen className="w-5 h-5 text-brand-teal" />
              <span>Create New Course</span>
            </h3>
            <p className="text-xs text-slate-500 mb-6">
              Create a structured course. You will be automatically enrolled as the primary student.
            </p>

            <form onSubmit={handleCreateCourse} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Course Code (e.g. SPAN-101, AWS-SAA)
                </label>
                <input
                  type="text"
                  required
                  value={newCode}
                  onChange={(e) => setNewCode(e.target.value)}
                  placeholder="CODE-101"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-brand-teal focus:ring-2 focus:ring-brand-teal/20 outline-none text-sm font-mono uppercase"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Course Title
                </label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Spanish Vocabulary Fundamentals"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-brand-teal focus:ring-2 focus:ring-brand-teal/20 outline-none text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Description
                </label>
                <textarea
                  rows={3}
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="Key concepts, goals, and learning objectives..."
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:border-brand-teal focus:ring-2 focus:ring-brand-teal/20 outline-none text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Badge Accent Color
                </label>
                <div className="flex items-center space-x-3">
                  <input
                    type="color"
                    value={newColor}
                    onChange={(e) => setNewColor(e.target.value)}
                    className="w-10 h-10 rounded-xl cursor-pointer border-0 p-0"
                  />
                  <span className="text-xs font-mono text-slate-600">{newColor}</span>
                </div>
              </div>

              <div className="pt-4 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="px-5 py-2.5 text-xs font-bold text-white bg-brand-teal hover:bg-brand-navy rounded-xl shadow-soft transition disabled:opacity-50"
                >
                  {isCreating ? 'Creating...' : 'Create Course'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
