import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Sparkles, LogOut, User, ShieldCheck, BookOpen } from 'lucide-react';

export const Navbar: React.FC = () => {
  const { user, session, logout } = useAuth();

  return (
    <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo & Tagline */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl gradient-tropical flex items-center justify-center text-white shadow-soft">
              <Sparkles className="w-5 h-5 text-brand-sand" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xl font-extrabold tracking-tight text-brand-dark">
                  Recallia
                </span>
                <span className="hidden sm:inline-block px-2 py-0.5 text-[10px] font-semibold bg-brand-sage/20 text-brand-teal rounded-full uppercase tracking-wider">
                  v1.0
                </span>
              </div>
              <p className="hidden md:block text-xs font-medium text-slate-500">
                Learn it. Recall it. Remember it.
              </p>
            </div>
          </div>

          {/* User Status / Account Bar */}
          {user && (
            <div className="flex items-center space-x-4">
              <div className="hidden sm:flex items-center space-x-2 px-3 py-1 bg-slate-50 border border-slate-200 rounded-lg">
                <ShieldCheck className="w-4 h-4 text-brand-emerald" />
                <span className="text-xs font-medium text-slate-600">
                  Student Session Active
                </span>
              </div>

              <div className="flex items-center space-x-3 pl-2 border-l border-slate-200">
                <div className="w-9 h-9 rounded-full bg-brand-teal text-white flex items-center justify-center font-bold text-sm shadow-xs">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <div className="hidden md:block text-left">
                  <div className="text-sm font-semibold text-slate-800 leading-tight">
                    {user.name}
                  </div>
                  <div className="text-xs text-slate-500 truncate max-w-[150px]">
                    {user.email}
                  </div>
                </div>

                <button
                  onClick={() => logout()}
                  title="Sign out of student account"
                  className="p-2 text-slate-500 hover:text-brand-ruby hover:bg-red-50 rounded-lg transition-colors"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
