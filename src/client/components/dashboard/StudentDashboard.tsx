import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { CourseCatalog } from '../courses/CourseCatalog';
import { TopicSelector } from '../courses/TopicSelector';
import { StandaloneDecks } from '../courses/StandaloneDecks';
import { 
  ShieldCheck, Key, Copy, Check, User, Clock, BookOpen, 
  Layers, CheckCircle, Award, Sparkles, Database, ArrowRight,
  Lock, RefreshCw, AlertCircle, FolderPlus
} from 'lucide-react';

interface SubjectSummary {
  name: string;
  slug: string;
  code: string;
  color: string;
  cardCount: number;
  topics: Array<{ name: string; cardCount: number }>;
}

type DashboardTab = 'overview' | 'courses' | 'topics' | 'decks' | 'security';

export const StudentDashboard: React.FC = () => {
  const { user, session, logout, resetPassword } = useAuth();
  const [copied, setCopied] = useState(false);
  const [subjects, setSubjects] = useState<SubjectSummary[]>([]);
  const [totalCards, setTotalCards] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<DashboardTab>('overview');
  const [selectedCourseId, setSelectedCourseId] = useState<string | undefined>(undefined);

  // Change password modal / state
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwMessage, setPwMessage] = useState<{ text: string; error: boolean } | null>(null);
  const [isUpdatingPw, setIsUpdatingPw] = useState(false);

  useEffect(() => {
    // Load subjects manifest from API
    fetch('/api/manifest')
      .then((res) => {
        if (res.ok) return res.json();
        return null;
      })
      .then((data) => {
        if (data && data.subjects) {
          setSubjects(data.subjects);
          setTotalCards(data.totalCards || 1172);
        }
      })
      .catch((err) => console.log('Notice: Seed manifest fetch:', err));
  }, []);

  const copySessionToken = () => {
    if (session?.token) {
      navigator.clipboard.writeText(session.token);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setPwMessage({ text: 'Passwords do not match.', error: true });
      return;
    }
    if (newPassword.length < 8) {
      setPwMessage({ text: 'Password must be at least 8 characters long.', error: true });
      return;
    }

    setIsUpdatingPw(true);
    setPwMessage(null);
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user?.email }),
      });
      const data = await res.json();
      if (data.resetToken) {
        await resetPassword(data.resetToken, newPassword);
        setPwMessage({ text: 'Password updated successfully! Please re-login with your new credentials.', error: false });
        setTimeout(() => {
          logout();
        }, 1500);
      } else {
        throw new Error('Failed to generate security reset token.');
      }
    } catch (err: any) {
      setPwMessage({ text: err.message || 'Password update failed.', error: true });
    } finally {
      setIsUpdatingPw(false);
    }
  };

  const navigateToTopics = (courseId?: string) => {
    setSelectedCourseId(courseId);
    setActiveTab('topics');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Student Greeting Banner */}
      <div className="rounded-3xl gradient-tropical p-8 text-white shadow-elevated relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-white/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center space-x-2 px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-xs font-semibold text-brand-sand mb-3">
              <ShieldCheck className="w-4 h-4 text-brand-sand" />
              <span>Verified Student Session</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
              Welcome back, {user?.name}!
            </h1>
            <p className="mt-2 text-slate-100 max-w-2xl text-sm sm:text-base">
              Your personalized learning environment is active. All course enrollments, topic selections, and review schedules are isolated to your account.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                activeTab === 'overview'
                  ? 'bg-white text-brand-teal shadow-soft'
                  : 'bg-white/15 text-white hover:bg-white/25'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('courses')}
              className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                activeTab === 'courses'
                  ? 'bg-white text-brand-teal shadow-soft'
                  : 'bg-white/15 text-white hover:bg-white/25'
              }`}
            >
              Courses
            </button>
            <button
              onClick={() => setActiveTab('topics')}
              className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                activeTab === 'topics'
                  ? 'bg-white text-brand-teal shadow-soft'
                  : 'bg-white/15 text-white hover:bg-white/25'
              }`}
            >
              Topic Queue
            </button>
            <button
              onClick={() => setActiveTab('decks')}
              className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                activeTab === 'decks'
                  ? 'bg-white text-brand-teal shadow-soft'
                  : 'bg-white/15 text-white hover:bg-white/25'
              }`}
            >
              Decks
            </button>
            <button
              onClick={() => setActiveTab('security')}
              className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                activeTab === 'security'
                  ? 'bg-white text-brand-teal shadow-soft'
                  : 'bg-white/15 text-white hover:bg-white/25'
              }`}
            >
              Security
            </button>
          </div>
        </div>
      </div>

      {/* Tab: Courses & Enrollments */}
      {activeTab === 'courses' && (
        <CourseCatalog onSelectCourse={navigateToTopics} />
      )}

      {/* Tab: Topic Queue Controls */}
      {activeTab === 'topics' && (
        <TopicSelector courseId={selectedCourseId} />
      )}

      {/* Tab: Standalone Decks */}
      {activeTab === 'decks' && (
        <StandaloneDecks />
      )}

      {/* Tab: Overview & Science Bank */}
      {activeTab === 'overview' && (
        <div className="space-y-8">
          
          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <div className="p-6 bg-white rounded-2xl border border-slate-200/80 shadow-soft">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Questions</span>
                <div className="w-8 h-8 rounded-lg bg-teal-50 text-brand-teal flex items-center justify-center">
                  <Database className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-4 text-3xl font-extrabold text-slate-900">
                {totalCards || 1172}
              </div>
              <p className="mt-1 text-xs text-slate-500">From ARC Science dataset</p>
            </div>

            <div className="p-6 bg-white rounded-2xl border border-slate-200/80 shadow-soft">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Subjects</span>
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-brand-emerald flex items-center justify-center">
                  <BookOpen className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-4 text-3xl font-extrabold text-slate-900">
                {subjects.length || 5}
              </div>
              <p className="mt-1 text-xs text-slate-500">Biology, Physics, Earth, Chem, Inquiry</p>
            </div>

            <div className="p-6 bg-white rounded-2xl border border-slate-200/80 shadow-soft">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Topics</span>
                <div className="w-8 h-8 rounded-lg bg-amber-50 text-brand-amber flex items-center justify-center">
                  <Layers className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-4 text-3xl font-extrabold text-slate-900">
                16
              </div>
              <p className="mt-1 text-xs text-slate-500">Independently toggleable units</p>
            </div>

            <div className="p-6 bg-white rounded-2xl border border-slate-200/80 shadow-soft">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Account Privacy</span>
                <div className="w-8 h-8 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center">
                  <ShieldCheck className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-4 text-2xl font-extrabold text-brand-emerald">
                Isolated
              </div>
              <p className="mt-1 text-xs text-slate-500">Student-specific data ownership</p>
            </div>
          </div>

          {/* Preloaded Subject Catalog */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-8 shadow-soft">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 pb-6 border-b border-slate-100">
              <div>
                <h2 className="text-xl font-bold text-slate-900 flex items-center space-x-2">
                  <BookOpen className="w-5 h-5 text-brand-teal" />
                  <span>General Science & Scientific Inquiry</span>
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  1,172 flashcard questions extracted, normalized, and categorized subject-wise into JSON seeds
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setActiveTab('topics')}
                  className="px-3 py-1.5 bg-brand-emerald text-white text-xs font-bold rounded-xl hover:bg-teal-700 shadow-xs transition"
                >
                  Configure Topics
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {subjects.map((subj) => (
                <div
                  key={subj.slug}
                  className="p-5 rounded-2xl border border-slate-200 hover:border-brand-emerald/50 hover:shadow-soft transition-all duration-200 bg-slate-50/50 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex justify-between items-center mb-3">
                      <span
                        className="px-2.5 py-0.5 rounded-md text-[11px] font-bold text-white uppercase tracking-wider"
                        style={{ backgroundColor: subj.color || '#0F4C5C' }}
                      >
                        {subj.code}
                      </span>
                      <span className="text-xs font-semibold text-slate-500">
                        {subj.cardCount} cards
                      </span>
                    </div>

                    <h3 className="font-bold text-slate-900 text-base mb-1">
                      {subj.name}
                    </h3>
                    <p className="text-xs text-slate-600 mb-4">
                      {subj.topics?.length || 0} sub-topics available
                    </p>

                    <div className="space-y-1.5 mb-4">
                      {subj.topics?.slice(0, 3).map((top, idx) => (
                        <div key={idx} className="flex justify-between items-center text-xs text-slate-600">
                          <span className="truncate max-w-[180px]">• {top.name}</span>
                          <span className="text-slate-400 text-[10px]">{top.cardCount} cards</span>
                        </div>
                      ))}
                      {(subj.topics?.length || 0) > 3 && (
                        <div className="text-[11px] text-brand-teal font-medium">
                          + {subj.topics.length - 3} more topics
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-200 flex justify-between items-center">
                    <button
                      onClick={() => setActiveTab('topics')}
                      className="text-xs text-brand-teal font-bold hover:underline flex items-center space-x-1"
                    >
                      <span>Manage Topics</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab: Security */}
      {activeTab === 'security' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Active Session & Student Data Details */}
          <div className="lg:col-span-7 bg-white rounded-3xl border border-slate-200/80 p-8 shadow-soft space-y-6">
            <div>
              <h2 className="text-xl font-bold text-slate-900 flex items-center space-x-2">
                <ShieldCheck className="w-5 h-5 text-brand-emerald" />
                <span>Student Identity & Session Security</span>
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Verified cryptographic details for your authenticated session
              </p>
            </div>

            <div className="space-y-4">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  Student Name
                </div>
                <div className="text-sm font-bold text-slate-900">{user?.name}</div>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  Registered Email Address
                </div>
                <div className="text-sm font-mono text-slate-800">{user?.email}</div>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  Unique Student ID (UUID)
                </div>
                <div className="text-sm font-mono text-slate-800 break-all">{user?.id}</div>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                <div className="flex justify-between items-center mb-1">
                  <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Active Session Token (Bearer)
                  </div>
                  <button
                    onClick={copySessionToken}
                    className="text-xs text-brand-teal hover:underline flex items-center space-x-1"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-brand-emerald" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Copied' : 'Copy Token'}</span>
                  </button>
                </div>
                <div className="text-xs font-mono text-slate-700 break-all bg-white p-2 rounded-lg border border-slate-200">
                  {session?.token || 'Active In-Memory Session'}
                </div>
                <div className="mt-2 text-[11px] text-slate-500 flex items-center space-x-1">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Expires: {session?.expiresAt ? new Date(session.expiresAt).toLocaleString() : '7 days from issue'}</span>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-200 flex justify-between items-center">
              <span className="text-xs text-slate-500">Need to switch accounts?</span>
              <button
                onClick={() => logout()}
                className="px-4 py-2 text-xs font-bold text-brand-ruby bg-red-50 hover:bg-red-100 rounded-xl transition-colors"
              >
                Sign Out of Session
              </button>
            </div>
          </div>

          {/* Change Password Panel */}
          <div className="lg:col-span-5 bg-white rounded-3xl border border-slate-200/80 p-8 shadow-soft">
            <h2 className="text-xl font-bold text-slate-900 flex items-center space-x-2 mb-2">
              <Key className="w-5 h-5 text-brand-teal" />
              <span>Update Password</span>
            </h2>
            <p className="text-xs text-slate-500 mb-6">
              Securely update your password. Your new password will be salted and hashed with scrypt.
            </p>

            {pwMessage && (
              <div
                className={`p-3 rounded-xl mb-4 text-xs font-medium flex items-center space-x-2 ${
                  pwMessage.error
                    ? 'bg-red-50 text-red-700 border border-red-200'
                    : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                }`}
              >
                {pwMessage.error ? <AlertCircle className="w-4 h-4 shrink-0" /> : <CheckCircle className="w-4 h-4 shrink-0" />}
                <span>{pwMessage.text}</span>
              </div>
            )}

            <form onSubmit={handlePasswordChange} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  New Password
                </label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Min. 8 chars (letters & numbers)"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-brand-teal focus:ring-2 focus:ring-brand-teal/20 outline-none text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm password"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-brand-teal focus:ring-2 focus:ring-brand-teal/20 outline-none text-sm"
                />
              </div>

              <button
                type="submit"
                disabled={isUpdatingPw}
                className="w-full py-2.5 px-4 rounded-xl font-bold text-white bg-brand-teal hover:bg-brand-navy shadow-soft transition text-sm flex items-center justify-center space-x-2 disabled:opacity-50"
              >
                <span>{isUpdatingPw ? 'Updating...' : 'Update Password'}</span>
              </button>
            </form>
          </div>

        </div>
      )}

    </div>
  );
};
