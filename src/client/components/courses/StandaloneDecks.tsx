import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { DeckItem } from '../../../server/courses/courseService';
import { 
  FolderPlus, Plus, BookOpen, Layers, CheckCircle2, 
  Sparkles, AlertCircle, X, ChevronRight, FileQuestion 
} from 'lucide-react';

export const StandaloneDecks: React.FC = () => {
  const { token } = useAuth();
  const [decks, setDecks] = useState<DeckItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newColor, setNewColor] = useState('#0A9396');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const fetchDecks = async () => {
    try {
      const res = await fetch('/api/courses/decks/all', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.decks) {
        setDecks(data.decks);
      }
    } catch (err) {
      console.error('Error fetching decks:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchDecks();
    }
  }, [token]);

  const handleCreateDeck = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle) return;
    setIsSubmitting(true);
    setMessage(null);
    try {
      const res = await fetch('/api/courses/decks/new', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: newTitle,
          description: newDesc,
          color: newColor,
          isStandalone: true,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setShowModal(false);
      setNewTitle('');
      setNewDesc('');
      setMessage(`Deck '${data.deck.title}' created successfully!`);
      await fetchDecks();
    } catch (err: any) {
      setMessage(`Error: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center space-x-2">
            <FolderPlus className="w-6 h-6 text-brand-teal" />
            <span>Standalone Decks</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Create independent card collections for quick studies, exam cram sheets, or personal vocabularies outside of formal courses.
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm text-white bg-brand-teal hover:bg-brand-navy shadow-soft transition-colors flex items-center space-x-2"
        >
          <Plus className="w-4 h-4" />
          <span>New Standalone Deck</span>
        </button>
      </div>

      {message && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center justify-between">
          <span>{message}</span>
          <button onClick={() => setMessage(null)} className="text-emerald-600 hover:text-emerald-800">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {decks.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-slate-200/80 shadow-soft">
          <div className="w-12 h-12 rounded-2xl bg-teal-50 text-brand-teal mx-auto flex items-center justify-center mb-4">
            <FolderPlus className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-800 mb-1">No Standalone Decks Yet</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mb-6">
            Create an independent flashcard deck for language words, exam formulas, or specific revision topics without creating a full course.
          </p>
          <button
            onClick={() => setShowModal(true)}
            className="px-4 py-2 text-xs font-bold text-white bg-brand-emerald hover:bg-teal-700 rounded-xl shadow-soft transition"
          >
            Create Your First Deck
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {decks.map((d) => (
            <div
              key={d.id}
              className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-soft hover:shadow-elevated transition flex flex-col justify-between"
            >
              <div>
                <div className="flex justify-between items-center mb-3">
                  <span
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: d.color || '#0F4C5C' }}
                  />
                  <span className="text-[11px] font-semibold text-slate-400">
                    {d.cardCount} cards
                  </span>
                </div>
                <h3 className="font-bold text-slate-900 text-base mb-1">{d.title}</h3>
                <p className="text-xs text-slate-500 mb-4 line-clamp-2">
                  {d.description || 'Independent flashcard deck.'}
                </p>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-between items-center text-xs">
                <span className="text-slate-400">Created: {new Date(d.createdAt).toLocaleDateString()}</span>
                <span className="font-bold text-brand-teal flex items-center space-x-1">
                  <span>Standalone</span>
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-8 shadow-elevated border border-slate-200 relative">
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-6 right-6 text-slate-400 hover:text-slate-600"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-xl font-bold text-slate-900 mb-1 flex items-center space-x-2">
              <FolderPlus className="w-5 h-5 text-brand-teal" />
              <span>Create Standalone Deck</span>
            </h3>
            <p className="text-xs text-slate-500 mb-6">
              Organize flashcards into an independent deck that does not require a formal course.
            </p>

            <form onSubmit={handleCreateDeck} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Deck Title
                </label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Quick Spanish Idioms"
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
                  placeholder="Target vocabulary, formulas, quick recall notes..."
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:border-brand-teal focus:ring-2 focus:ring-brand-teal/20 outline-none text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Deck Color
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
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 text-xs font-bold text-white bg-brand-teal hover:bg-brand-navy rounded-xl shadow-soft transition disabled:opacity-50"
                >
                  {isSubmitting ? 'Creating...' : 'Create Deck'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
