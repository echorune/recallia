import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { 
  Layers, CheckCircle, XCircle, BookOpen, Shield, 
  ChevronDown, ChevronRight, ToggleLeft, ToggleRight, Sparkles, AlertCircle 
} from 'lucide-react';

interface TopicItem {
  id: string;
  name: string;
  slug: string;
  description: string;
  cardCount: number;
  isEnabled: boolean;
}

interface SubjectItem {
  id: string;
  name: string;
  slug: string;
  code: string;
  description: string;
  color: string;
  cardCount: number;
  topics: TopicItem[];
}

interface CourseDetails {
  id: string;
  code: string;
  title: string;
  description: string;
  color: string;
  subjects: SubjectItem[];
}

export const TopicSelector: React.FC<{ courseId?: string }> = ({ courseId }) => {
  const { token } = useAuth();
  const [course, setCourse] = useState<CourseDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedSubjects, setExpandedSubjects] = useState<Record<string, boolean>>({});
  const [updatingTopicId, setUpdatingTopicId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const fetchCourseData = async () => {
    try {
      // If courseId not provided, fetch primary course from /api/courses
      let targetId = courseId;
      if (!targetId) {
        const listRes = await fetch('/api/courses', {
          headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        });
        const listData = await listRes.json();
        if (listData.courses && listData.courses.length > 0) {
          targetId = listData.courses[0].id;
        }
      }

      if (targetId) {
        const res = await fetch(`/api/courses/${targetId}`, {
          headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        });
        const data = await res.json();
        if (data.course) {
          setCourse(data.course);
          // Expand all subjects by default for immediate clarity
          const exp: Record<string, boolean> = {};
          data.course.subjects.forEach((s: SubjectItem) => {
            exp[s.id] = true;
          });
          setExpandedSubjects(exp);
        }
      }
    } catch (err) {
      console.error('Error fetching course hierarchy:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCourseData();
  }, [courseId, token]);

  const toggleSubjectExpanded = (subjId: string) => {
    setExpandedSubjects((prev) => ({
      ...prev,
      [subjId]: !prev[subjId],
    }));
  };

  const handleToggleTopic = async (topicId: string, currentState: boolean) => {
    setUpdatingTopicId(topicId);
    setStatusMessage(null);
    const nextState = !currentState;

    try {
      const res = await fetch(`/api/courses/topics/${topicId}/toggle`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ isEnabled: nextState }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to toggle topic preference.');
      }

      // Update local state optimistically
      setCourse((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          subjects: prev.subjects.map((subj) => ({
            ...subj,
            topics: subj.topics.map((t) =>
              t.id === topicId ? { ...t, isEnabled: nextState } : t
            ),
          })),
        };
      });

      setStatusMessage(data.message || `Topic ${nextState ? 'enabled' : 'disabled'}.`);
    } catch (err: any) {
      console.error(err);
    } finally {
      setUpdatingTopicId(null);
    }
  };

  const handleBulkToggleSubject = async (subjectId: string, enableAll: boolean) => {
    try {
      const res = await fetch(`/api/courses/subjects/${subjectId}/toggle-all`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ isEnabled: enableAll }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      // Update local state
      setCourse((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          subjects: prev.subjects.map((subj) =>
            subj.id === subjectId
              ? {
                  ...subj,
                  topics: subj.topics.map((t) => ({ ...t, isEnabled: enableAll })),
                }
              : subj
          ),
        };
      });

      setStatusMessage(data.message);
    } catch (err: any) {
      console.error('Bulk toggle error:', err);
    }
  };

  if (isLoading) {
    return (
      <div className="p-8 text-center text-slate-500">
        Loading topic hierarchy and study preferences...
      </div>
    );
  }

  if (!course) {
    return (
      <div className="p-8 text-center text-slate-500">
        No course selected. Please enroll in a course from the Catalog.
      </div>
    );
  }

  // Calculate totals
  const allTopics = course.subjects.flatMap((s) => s.topics);
  const totalTopics = allTopics.length;
  const enabledTopics = allTopics.filter((t) => t.isEnabled).length;
  const activeCardsInQueue = allTopics
    .filter((t) => t.isEnabled)
    .reduce((sum, t) => sum + t.cardCount, 0);
  const totalCards = allTopics.reduce((sum, t) => sum + t.cardCount, 0);

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div>
        <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center space-x-2">
          <Layers className="w-6 h-6 text-brand-emerald" />
          <span>Topic Selection & Review Queue Controls</span>
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Select which specific topics appear in your daily active review queue. Changing selections never deletes or resets your historical review data.
        </p>
      </div>

      {/* Progress & Queue Summary Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-soft">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Active Topics</span>
          <div className="mt-2 text-2xl font-extrabold text-brand-dark">
            {enabledTopics} <span className="text-sm font-medium text-slate-400">/ {totalTopics}</span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">Toggle on/off as you progress</p>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-soft">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Eligible Questions</span>
          <div className="mt-2 text-2xl font-extrabold text-brand-emerald">
            {activeCardsInQueue} <span className="text-sm font-medium text-slate-400">/ {totalCards}</span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">Available for daily spaced reviews</p>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-soft flex flex-col justify-between">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Queue Status</span>
          <div className="mt-2">
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-brand-emerald/15 text-brand-teal">
              {enabledTopics > 0 ? 'Active Queue' : 'Queue Empty (All Disabled)'}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">Updated in real-time</p>
        </div>
      </div>

      {/* Reassurance Banner */}
      <div className="p-4 rounded-2xl bg-brand-sand/30 border border-brand-sand/60 flex items-start space-x-3 text-xs text-slate-800">
        <Shield className="w-4 h-4 text-brand-rust shrink-0 mt-0.5" />
        <div>
          <span className="font-bold">SM-2 History Integrity:</span> When a topic is disabled, its flashcards simply sleep—no review logs, ease factors, intervals, or repetition counts are altered. Re-enabling a topic restores its cards with their exact previous schedule.
        </div>
      </div>

      {statusMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center space-x-2">
          <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Subjects & Topics Accordion */}
      <div className="space-y-4">
        {course.subjects.map((subj) => {
          const isExpanded = expandedSubjects[subj.id] ?? true;
          const subjEnabledCount = subj.topics.filter((t) => t.isEnabled).length;
          const allSubjEnabled = subjEnabledCount === subj.topics.length;

          return (
            <div
              key={subj.id}
              className="bg-white rounded-2xl border border-slate-200/80 shadow-soft overflow-hidden"
            >
              {/* Subject Header Bar */}
              <div
                className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/70 border-b border-slate-100 cursor-pointer"
                onClick={() => toggleSubjectExpanded(subj.id)}
              >
                <div className="flex items-center space-x-3">
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-xs font-extrabold shadow-xs"
                    style={{ backgroundColor: subj.color || '#0A9396' }}
                  >
                    {subj.code}
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 leading-snug">
                      {subj.name}
                    </h3>
                    <div className="flex items-center space-x-2 text-xs text-slate-500 mt-0.5">
                      <span>{subj.topics.length} topics</span>
                      <span>&bull;</span>
                      <span className="font-semibold text-brand-emerald">{subj.cardCount} questions</span>
                      <span>&bull;</span>
                      <span>{subjEnabledCount}/{subj.topics.length} enabled</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-3" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => handleBulkToggleSubject(subj.id, !allSubjEnabled)}
                    className="text-xs font-bold px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 transition"
                  >
                    {allSubjEnabled ? 'Disable All' : 'Enable All'}
                  </button>

                  <button
                    onClick={() => toggleSubjectExpanded(subj.id)}
                    className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
                  >
                    {isExpanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {/* Topics Grid */}
              {isExpanded && (
                <div className="p-4 sm:p-5 grid grid-cols-1 md:grid-cols-2 gap-3 bg-white">
                  {subj.topics.map((topic) => {
                    const isUpdating = updatingTopicId === topic.id;

                    return (
                      <div
                        key={topic.id}
                        className={`p-4 rounded-xl border transition-all duration-150 flex items-center justify-between gap-3 ${
                          topic.isEnabled
                            ? 'bg-emerald-50/30 border-emerald-200/80 shadow-xs'
                            : 'bg-slate-50/50 border-slate-200 opacity-60'
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center space-x-2">
                            <span className="font-bold text-sm text-slate-800 truncate">
                              {topic.name}
                            </span>
                            <span className="text-[11px] font-semibold text-slate-400 shrink-0">
                              ({topic.cardCount} cards)
                            </span>
                          </div>
                          {topic.description && (
                            <p className="text-xs text-slate-500 truncate mt-0.5">
                              {topic.description}
                            </p>
                          )}
                        </div>

                        {/* Interactive Toggle Switch */}
                        <button
                          type="button"
                          disabled={isUpdating}
                          onClick={() => handleToggleTopic(topic.id, topic.isEnabled)}
                          title={topic.isEnabled ? 'Click to exclude topic from daily review queue' : 'Click to include topic in daily review queue'}
                          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                            topic.isEnabled ? 'bg-brand-emerald' : 'bg-slate-300'
                          } disabled:opacity-50`}
                        >
                          <span
                            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                              topic.isEnabled ? 'translate-x-5' : 'translate-x-0'
                            }`}
                          />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

    </div>
  );
};
