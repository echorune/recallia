import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { ImportExportModal } from './ImportExportModal';
import { 
  Search, Filter, Plus, FileText, Sparkles, ChevronLeft, 
  ChevronRight, Edit3, Trash2, Eye, EyeOff, RotateCw, 
  Database, CheckCircle2, AlertCircle, X, Layers, Tag, Award, Shield 
} from 'lucide-react';

interface FlashcardItem {
  id: string;
  front: string;
  back: string;
  answerKey?: string | null;
  difficulty: number;
  tags: string[];
  subjectName?: string | null;
  subjectCode?: string | null;
  subjectColor?: string | null;
  topicName?: string | null;
  deckTitle?: string | null;
  versionCount: number;
  createdAt: string;
}

export const FlashcardBrowser: React.FC = () => {
  const { token, user } = useAuth();
  const [cards, setCards] = useState<FlashcardItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // Filters & Pagination
  const [search, setSearch] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('');
  const [topicFilter, setTopicFilter] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 24;

  // Taxonomy options for dropdowns
  const [subjectsList, setSubjectsList] = useState<any[]>([]);
  const [decksList, setDecksList] = useState<any[]>([]);

  // Modals state
  const [isImportExportOpen, setIsImportExportOpen] = useState(false);
  const [viewCard, setViewCard] = useState<FlashcardItem | null>(null);
  const [viewFlipped, setViewFlipped] = useState(false);
  const [cardVersions, setCardVersions] = useState<any[]>([]);

  // Create/Edit Card modal state
  const [editingCard, setEditingCard] = useState<FlashcardItem | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [formFront, setFormFront] = useState('');
  const [formBack, setFormBack] = useState('');
  const [formDifficulty, setFormDifficulty] = useState(2);
  const [formTags, setFormTags] = useState('');
  const [formAnswerKey, setFormAnswerKey] = useState('');
  const [formSubjectId, setFormSubjectId] = useState('');
  const [formTopicId, setFormTopicId] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; error: boolean } | null>(null);

  // Fetch Taxonomy (Subjects, Topics, Decks)
  useEffect(() => {
    fetch('/api/manifest')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && data.subjects) setSubjectsList(data.subjects);
      })
      .catch(() => {});

    if (token) {
      fetch('/api/courses/decks/all', {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data && data.decks) setDecksList(data.decks);
        })
        .catch(() => {});
    }
  }, [token]);

  // Fetch Cards based on Search & Filters
  const fetchCards = async () => {
    setIsLoading(true);
    try {
      const offset = (page - 1) * pageSize;
      let url = `/api/cards?limit=${pageSize}&offset=${offset}&`;
      if (search.trim()) url += `search=${encodeURIComponent(search.trim())}&`;
      if (subjectFilter) url += `subjectId=${encodeURIComponent(subjectFilter)}&`;
      if (topicFilter) url += `topicId=${encodeURIComponent(topicFilter)}&`;
      if (difficultyFilter) url += `difficulty=${encodeURIComponent(difficultyFilter)}&`;

      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(url, { headers });
      const data = await res.json();
      if (data.cards) {
        setCards(data.cards);
        setTotalCount(data.total || 0);
      }
    } catch (err) {
      console.error('Error fetching cards:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchCards();
    }, 200);
    return () => clearTimeout(timer);
  }, [search, subjectFilter, topicFilter, difficultyFilter, page, token]);

  const handleOpenDetail = async (card: FlashcardItem) => {
    setViewCard(card);
    setViewFlipped(false);
    try {
      const res = await fetch(`/api/cards/${card.id}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      if (data.versions) {
        setCardVersions(data.versions);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleOpenCreate = () => {
    setEditingCard(null);
    setFormFront('');
    setFormBack('');
    setFormDifficulty(2);
    setFormTags('');
    setFormAnswerKey('');
    setFormSubjectId(subjectsList[0]?.id || '');
    setFormTopicId('');
    setIsCreateModalOpen(true);
  };

  const handleOpenEdit = (card: FlashcardItem) => {
    setEditingCard(card);
    setFormFront(card.front);
    setFormBack(card.back);
    setFormDifficulty(card.difficulty || 2);
    setFormTags(card.tags.join(', '));
    setFormAnswerKey(card.answerKey || '');
    setIsCreateModalOpen(true);
  };

  const handleSaveCard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formFront || !formBack) return;
    setIsSaving(true);
    setStatusMessage(null);

    const tagsArray = formTags.split(/[,;]/).map((t) => t.trim()).filter((t) => t.length > 0);

    try {
      if (editingCard) {
        // Update Card (tracks version)
        const res = await fetch(`/api/cards/${editingCard.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            front: formFront,
            back: formBack,
            difficulty: formDifficulty,
            tags: tagsArray,
            answerKey: formAnswerKey,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);

        setStatusMessage({ text: 'Card updated and new version recorded.', error: false });
      } else {
        // Create Card
        const res = await fetch('/api/cards', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            front: formFront,
            back: formBack,
            difficulty: formDifficulty,
            tags: tagsArray,
            answerKey: formAnswerKey,
            subjectId: formSubjectId || undefined,
            topicId: formTopicId || undefined,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);

        setStatusMessage({ text: 'Card created successfully.', error: false });
      }

      setIsCreateModalOpen(false);
      await fetchCards();
    } catch (err: any) {
      setStatusMessage({ text: err.message || 'Save failed.', error: true });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteCard = async (cardId: string) => {
    if (!confirm('Are you sure you want to delete this flashcard?')) return;
    try {
      const res = await fetch(`/api/cards/${cardId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setStatusMessage({ text: 'Card deleted.', error: false });
        await fetchCards();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const totalPages = Math.ceil(totalCount / pageSize) || 1;

  return (
    <div className="space-y-6">
      
      {/* Top Header & Action Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center space-x-2">
            <FileText className="w-6 h-6 text-brand-teal" />
            <span>Flashcard Question Bank</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Browse, search, edit, and organize all {totalCount.toLocaleString()} flashcards across your curriculum.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setIsImportExportOpen(true)}
            className="px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm text-brand-dark bg-white border border-slate-200 hover:bg-slate-50 shadow-xs transition flex items-center space-x-2"
          >
            <Database className="w-4 h-4 text-brand-teal" />
            <span>Import / Export CSV</span>
          </button>

          <button
            onClick={handleOpenCreate}
            className="px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm text-white bg-brand-teal hover:bg-brand-navy shadow-soft transition flex items-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>New Flashcard</span>
          </button>
        </div>
      </div>

      {statusMessage && (
        <div
          className={`p-3 rounded-xl text-xs font-semibold flex items-center justify-between ${
            statusMessage.error
              ? 'bg-red-50 text-red-700 border border-red-200'
              : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
          }`}
        >
          <span>{statusMessage.text}</span>
          <button onClick={() => setStatusMessage(null)}>
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-soft space-y-3">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search by question keywords, answer text, or tags..."
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 focus:border-brand-teal focus:ring-2 focus:ring-brand-teal/20 outline-none text-xs sm:text-sm"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Subject Filter */}
          <select
            value={subjectFilter}
            onChange={(e) => {
              setSubjectFilter(e.target.value);
              setTopicFilter('');
              setPage(1);
            }}
            className="p-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700"
          >
            <option value="">All Subjects (5)</option>
            {subjectsList.map((s) => (
              <option key={s.slug} value={s.slug}>{s.name}</option>
            ))}
          </select>

          {/* Difficulty Filter */}
          <select
            value={difficultyFilter}
            onChange={(e) => {
              setDifficultyFilter(e.target.value);
              setPage(1);
            }}
            className="p-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700"
          >
            <option value="">All Difficulties</option>
            <option value="1">Level 1 (Easy)</option>
            <option value="2">Level 2 (Medium-Low)</option>
            <option value="3">Level 3 (Medium)</option>
            <option value="4">Level 4 (Hard)</option>
            <option value="5">Level 5 (Advanced)</option>
          </select>
        </div>

        {/* Counter & Active Filter Pills */}
        <div className="flex justify-between items-center text-xs text-slate-500 pt-2 border-t border-slate-100">
          <div>
            Showing <span className="font-bold text-slate-900">{cards.length}</span> of{' '}
            <span className="font-bold text-slate-900">{totalCount.toLocaleString()}</span> questions
          </div>
          <div>
            Page <span className="font-bold">{page}</span> of <span className="font-bold">{totalPages}</span>
          </div>
        </div>
      </div>

      {/* Cards Grid */}
      {isLoading ? (
        <div className="p-12 text-center text-slate-400">Loading flashcards...</div>
      ) : cards.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 text-slate-500">
          No flashcards match your search query or filter.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {cards.map((card) => (
            <div
              key={card.id}
              className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-soft hover:shadow-elevated transition-all flex flex-col justify-between"
            >
              <div>
                {/* Meta Header */}
                <div className="flex justify-between items-start gap-2 mb-3">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {card.subjectCode && (
                      <span
                        className="px-2 py-0.5 rounded text-[10px] font-extrabold text-white uppercase tracking-wider"
                        style={{ backgroundColor: card.subjectColor || '#0F4C5C' }}
                      >
                        {card.subjectCode}
                      </span>
                    )}
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-600">
                      Level {card.difficulty}
                    </span>
                    {card.versionCount > 1 && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                        v{card.versionCount}
                      </span>
                    )}
                  </div>

                  {card.answerKey && (
                    <span className="w-6 h-6 rounded-full bg-brand-emerald/15 text-brand-emerald font-extrabold text-xs flex items-center justify-center shrink-0">
                      {card.answerKey}
                    </span>
                  )}
                </div>

                {/* Question Front */}
                <h4 className="text-sm font-bold text-slate-900 leading-snug line-clamp-4 mb-3">
                  {card.front}
                </h4>

                {/* Subject & Topic Subtext */}
                {(card.subjectName || card.topicName) && (
                  <p className="text-[11px] text-slate-500 mb-3 truncate">
                    {card.subjectName} {card.topicName ? `› ${card.topicName}` : ''}
                  </p>
                )}

                {/* Tags */}
                {card.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-4">
                    {card.tags.slice(0, 3).map((t, idx) => (
                      <span key={idx} className="px-1.5 py-0.5 rounded text-[10px] bg-slate-50 text-slate-500 border border-slate-100">
                        #{t}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Card Actions */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <button
                  onClick={() => handleOpenDetail(card)}
                  className="text-xs font-bold text-brand-teal hover:underline flex items-center space-x-1"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Reveal & Flip</span>
                </button>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleOpenEdit(card)}
                    title="Edit flashcard"
                    className="p-1.5 text-slate-400 hover:text-brand-teal hover:bg-slate-50 rounded-lg transition"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteCard(card.id)}
                    title="Delete flashcard"
                    className="p-1.5 text-slate-400 hover:text-brand-ruby hover:bg-red-50 rounded-lg transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination Bar */}
      {totalPages > 1 && (
        <div className="flex justify-between items-center p-4 bg-white rounded-2xl border border-slate-200">
          <button
            disabled={page === 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 flex items-center space-x-1"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Previous</span>
          </button>

          <span className="text-xs font-semibold text-slate-600">
            Page {page} of {totalPages}
          </span>

          <button
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 flex items-center space-x-1"
          >
            <span>Next</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Modal: Card Detail & Interactive Flip Preview */}
      {viewCard && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-8 shadow-elevated border border-slate-200 relative">
            <button
              onClick={() => setViewCard(null)}
              className="absolute top-6 right-6 text-slate-400 hover:text-slate-600"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-2 text-xs text-slate-500 mb-4">
              <span className="font-bold text-brand-teal uppercase">{viewCard.subjectCode || 'General'}</span>
              <span>&bull;</span>
              <span>{viewCard.subjectName}</span>
              {viewCard.versionCount > 1 && (
                <>
                  <span>&bull;</span>
                  <span className="font-bold text-amber-700">v{viewCard.versionCount} (Edited)</span>
                </>
              )}
            </div>

            {/* Interactive Flip Card Panel */}
            <div
              onClick={() => setViewFlipped(!viewFlipped)}
              className="min-h-[220px] p-6 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/70 hover:bg-slate-50 transition cursor-pointer flex flex-col justify-between mb-6"
            >
              <div>
                <div className="text-[10px] uppercase font-bold text-slate-400 mb-2 flex justify-between items-center">
                  <span>{viewFlipped ? 'Answer (Back)' : 'Question (Front)'}</span>
                  <span className="flex items-center space-x-1 text-brand-teal font-semibold">
                    <RotateCw className="w-3 h-3" />
                    <span>Click to flip</span>
                  </span>
                </div>
                <div className="text-sm font-semibold text-slate-900 whitespace-pre-wrap leading-relaxed">
                  {viewFlipped ? viewCard.back : viewCard.front}
                </div>
              </div>

              {viewCard.answerKey && viewFlipped && (
                <div className="mt-4 pt-3 border-t border-slate-200 text-xs font-bold text-brand-emerald">
                  Answer Key: {viewCard.answerKey}
                </div>
              )}
            </div>

            {/* Version History (if edited) */}
            {cardVersions.length > 1 && (
              <div className="mb-6 pt-4 border-t border-slate-100">
                <h5 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Version History ({cardVersions.length} revisions)
                </h5>
                <div className="space-y-1.5 max-h-32 overflow-y-auto text-xs text-slate-600">
                  {cardVersions.map((v) => (
                    <div key={v.id} className="p-2 bg-slate-50 rounded-lg flex justify-between items-center">
                      <span className="font-bold">v{v.versionNumber}</span>
                      <span className="truncate max-w-[240px] text-slate-500">{v.front}</span>
                      <span className="text-[10px] text-slate-400">{new Date(v.createdAt).toLocaleDateString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => handleOpenEdit(viewCard)}
                className="px-4 py-2 text-xs font-bold text-brand-dark bg-slate-100 hover:bg-slate-200 rounded-xl transition"
              >
                Edit Card
              </button>
              <button
                onClick={() => setViewCard(null)}
                className="px-5 py-2 text-xs font-bold text-white bg-brand-teal hover:bg-brand-navy rounded-xl shadow-soft transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Create / Edit Card */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-8 shadow-elevated border border-slate-200 relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setIsCreateModalOpen(false)}
              className="absolute top-6 right-6 text-slate-400 hover:text-slate-600"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-xl font-bold text-slate-900 mb-1 flex items-center space-x-2">
              <FileText className="w-5 h-5 text-brand-teal" />
              <span>{editingCard ? 'Edit Flashcard' : 'Create New Flashcard'}</span>
            </h3>
            <p className="text-xs text-slate-500 mb-6">
              {editingCard ? 'Modifications will be automatically logged to card version history.' : 'Add a card to your question bank.'}
            </p>

            <form onSubmit={handleSaveCard} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Card Front / Question *
                </label>
                <textarea
                  rows={4}
                  required
                  value={formFront}
                  onChange={(e) => setFormFront(e.target.value)}
                  placeholder="Enter the question prompt and choices..."
                  className="w-full p-3 rounded-xl border border-slate-200 focus:border-brand-teal focus:ring-2 focus:ring-brand-teal/20 outline-none text-sm"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Card Back / Answer & Explanation *
                </label>
                <textarea
                  rows={3}
                  required
                  value={formBack}
                  onChange={(e) => setFormBack(e.target.value)}
                  placeholder="Enter the verified correct answer and breakdown..."
                  className="w-full p-3 rounded-xl border border-slate-200 focus:border-brand-teal focus:ring-2 focus:ring-brand-teal/20 outline-none text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Answer Key (e.g. A, B, C, D)
                  </label>
                  <input
                    type="text"
                    value={formAnswerKey}
                    onChange={(e) => setFormAnswerKey(e.target.value)}
                    placeholder="e.g. C"
                    className="w-full p-2.5 rounded-xl border border-slate-200 uppercase font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Difficulty Level (1 to 5)
                  </label>
                  <select
                    value={formDifficulty}
                    onChange={(e) => setFormDifficulty(Number(e.target.value))}
                    className="w-full p-2.5 bg-white rounded-xl border border-slate-200 font-semibold"
                  >
                    <option value={1}>1 - Easy</option>
                    <option value={2}>2 - Medium-Low</option>
                    <option value={3}>3 - Medium</option>
                    <option value={4}>4 - Hard</option>
                    <option value={5}>5 - Advanced</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Tags (comma separated)
                </label>
                <input
                  type="text"
                  value={formTags}
                  onChange={(e) => setFormTags(e.target.value)}
                  placeholder="biology, cells, exam-2026"
                  className="w-full p-2.5 rounded-xl border border-slate-200"
                />
              </div>

              <div className="pt-4 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 font-bold text-white bg-brand-teal hover:bg-brand-navy rounded-xl shadow-soft transition disabled:opacity-50"
                >
                  {isSaving ? 'Saving...' : editingCard ? 'Save Version' : 'Create Flashcard'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Import / Export Center */}
      <ImportExportModal
        isOpen={isImportExportOpen}
        onClose={() => setIsImportExportOpen(false)}
        onImportComplete={() => {
          fetchCards();
        }}
        subjects={subjectsList}
        decks={decksList}
      />

    </div>
  );
};
