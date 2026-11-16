import React from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { AuthPage } from './components/auth/AuthPage';
import { StudentDashboard } from './components/dashboard/StudentDashboard';
import { Sparkles } from 'lucide-react';

const AppContent: React.FC = () => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#F4F6F6] text-brand-dark">
        <div className="w-14 h-14 rounded-2xl gradient-tropical flex items-center justify-center text-white shadow-soft animate-bounce">
          <Sparkles className="w-7 h-7 text-brand-sand" />
        </div>
        <h2 className="mt-4 text-xl font-bold tracking-tight">Recallia</h2>
        <p className="text-xs font-medium text-slate-500 mt-1">
          Loading secure student session...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#F8F9FA] text-[#0B252E]">
      <Navbar />
      <main className="flex-1">
        {!user ? <AuthPage /> : <StudentDashboard />}
      </main>
      <footer className="py-6 border-t border-slate-200 bg-white/50 text-center text-xs text-slate-500">
        <p className="font-medium">
          Recallia — Learn it. Recall it. Remember it. &bull; Spaced-Repetition Learning Platform
        </p>
      </footer>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default App;
