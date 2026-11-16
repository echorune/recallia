import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { ColumnMapping, ParsedCardPreview } from '../../../core/csv/csvParser';
import { 
  Upload, Download, FileText, CheckCircle2, AlertCircle, 
  X, RefreshCw, Layers, ShieldCheck, Database, Table 
} from 'lucide-react';

interface ImportExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete?: () => void;
  subjects?: Array<{ id: string; name: string; topics: Array<{ id: string; name: string }> }>;
  decks?: Array<{ id: string; title: string }>;
}

export const ImportExportModal: React.FC<ImportExportModalProps> = ({
  isOpen,
  onClose,
  onImportComplete,
  subjects = [],
  decks = [],
}) => {
  const { token } = useAuth();
  const [activeTab, setActiveTab] = useState<'import' | 'export' | 'restore'>('import');

  // CSV Import State
  const [rawCSV, setRawCSV] = useState<string>('');
  const [customDelimiter, setCustomDelimiter] = useState<string>('');
  const [targetType, setTargetType] = useState<'subject' | 'deck'>('subject');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
  const [selectedTopicId, setSelectedTopicId] = useState<string>('');
  const [selectedDeckId, setSelectedDeckId] = useState<string>('');

  // Column Mapping
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<ColumnMapping>({ front: '', back: '' });
  const [previewCards, setPreviewCards] = useState<ParsedCardPreview[]>([]);
  const [previewStats, setPreviewStats] = useState<{
    total: number;
    valid: number;
    duplicates: number;
    errors: number;
    detectedDelimiter: string;
  } | null>(null);

  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [isCommitting, setIsCommitting] = useState(false);
  const [importStatus, setImportStatus] = useState<{ text: string; error: boolean } | null>(null);

  // Export State
  const [exportScope, setExportScope] = useState<'all' | 'subject' | 'deck'>('all');
  const [exportSubjectId, setExportSubjectId] = useState<string>('');
  const [exportDeckId, setExportDeckId] = useState<string>('');
  const [exportFormat, setExportFormat] = useState<'csv' | 'json'>('csv');
  const [isExporting, setIsExporting] = useState(false);

  // Restore State
  const [restoreJSON, setRestoreJSON] = useState<string>('');
  const [restoreMessage, setRestoreMessage] = useState<{ text: string; error: boolean } | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        setRawCSV(text);
        triggerPreview(text, customDelimiter, undefined);
      }
    };
    reader.readAsText(file);
  };

  const triggerPreview = async (csvText: string, delim?: string, userMapping?: ColumnMapping) => {
    if (!csvText.trim()) return;
    setIsLoadingPreview(true);
    setImportStatus(null);
    try {
      const res = await fetch('/api/cards/preview-csv', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          rawContent: csvText,
          customDelimiter: delim || undefined,
          mapping: userMapping,
          targetScope: {
            subjectId: selectedSubjectId || undefined,
            deckId: selectedDeckId || undefined,
          },
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setHeaders(data.headers || []);
      setMapping(data.suggestedMapping || { front: '', back: '' });
      setPreviewCards(data.cards || []);
      setPreviewStats({
        total: data.totalRows,
        valid: data.validCount,
        duplicates: data.duplicateCount,
        errors: data.errorCount,
        detectedDelimiter: data.detectedDelimiter,
      });
    } catch (err: any) {
      setImportStatus({ text: err.message || 'Failed to parse CSV.', error: true });
    } finally {
      setIsLoadingPreview(false);
    }
  };

  const handleCommitImport = async () => {
    const validCards = previewCards.filter((c) => c.isValid);
    if (validCards.length === 0) {
      setImportStatus({ text: 'No valid cards to import.', error: true });
      return;
    }

    setIsCommitting(true);
    setImportStatus(null);
    try {
      const res = await fetch('/api/cards/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          target: {
            subjectId: targetType === 'subject' ? selectedSubjectId || undefined : undefined,
            topicId: targetType === 'subject' ? selectedTopicId || undefined : undefined,
            deckId: targetType === 'deck' ? selectedDeckId || undefined : undefined,
          },
          cards: validCards.map((c) => ({
            front: c.front,
            back: c.back,
            difficulty: c.difficulty,
            tags: c.tags,
            answerKey: c.answerKey,
          })),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setImportStatus({ text: data.message, error: false });
      if (onImportComplete) onImportComplete();
    } catch (err: any) {
      setImportStatus({ text: err.message || 'Import commit failed.', error: true });
    } finally {
      setIsCommitting(false);
    }
  };

  const handleExportDownload = () => {
    setIsExporting(true);
    let url = `/api/cards/export/${exportFormat}?`;
    if (exportScope === 'subject' && exportSubjectId) {
      url += `subjectId=${encodeURIComponent(exportSubjectId)}&`;
    } else if (exportScope === 'deck' && exportDeckId) {
      url += `deckId=${encodeURIComponent(exportDeckId)}&`;
    }

    const a = document.createElement('a');
    a.href = url;
    a.download = exportFormat === 'csv' ? 'recallia_export.csv' : 'recallia_backup.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setIsExporting(false);
  };

  const handleRestoreSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restoreJSON.trim()) return;
    setIsRestoring(true);
    setRestoreMessage(null);
    try {
      const parsed = JSON.parse(restoreJSON);
      const res = await fetch('/api/cards/restore/json', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(parsed),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setRestoreMessage({ text: data.message, error: false });
      if (onImportComplete) onImportComplete();
    } catch (err: any) {
      setRestoreMessage({ text: err.message || 'JSON restore failed.', error: true });
    } finally {
      setIsRestoring(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-4xl w-full p-6 sm:p-8 shadow-elevated border border-slate-200 my-8 max-h-[90vh] flex flex-col justify-between overflow-hidden">
        
        {/* Header */}
        <div>
          <div className="flex justify-between items-center pb-4 border-b border-slate-100 mb-6">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl gradient-tropical flex items-center justify-center text-white">
                <Database className="w-5 h-5 text-brand-sand" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900">Flashcard Data Center</h3>
                <p className="text-xs text-slate-500">Bulk CSV import with column mapping, CSV exports & JSON backups</p>
              </div>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Tab Selector */}
          <div className="flex space-x-2 p-1 bg-slate-100 rounded-xl mb-6">
            <button
              onClick={() => setActiveTab('import')}
              className={`flex-1 py-2 text-xs sm:text-sm font-bold rounded-lg transition ${
                activeTab === 'import' ? 'bg-white text-brand-teal shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Bulk CSV Import
            </button>
            <button
              onClick={() => setActiveTab('export')}
              className={`flex-1 py-2 text-xs sm:text-sm font-bold rounded-lg transition ${
                activeTab === 'export' ? 'bg-white text-brand-teal shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Export (CSV / JSON)
            </button>
            <button
              onClick={() => setActiveTab('restore')}
              className={`flex-1 py-2 text-xs sm:text-sm font-bold rounded-lg transition ${
                activeTab === 'restore' ? 'bg-white text-brand-teal shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              JSON Restore
            </button>
          </div>
        </div>

        {/* Tab 1: CSV Import */}
        {activeTab === 'import' && (
          <div className="overflow-y-auto space-y-6 flex-1 pr-1">
            {importStatus && (
              <div
                className={`p-3 rounded-xl text-xs font-semibold flex items-center space-x-2 ${
                  importStatus.error
                    ? 'bg-red-50 text-red-700 border border-red-200'
                    : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                }`}
              >
                {importStatus.error ? <AlertCircle className="w-4 h-4 shrink-0" /> : <CheckCircle2 className="w-4 h-4 shrink-0" />}
                <span>{importStatus.text}</span>
              </div>
            )}

            {/* Target Scope Selection */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs">
              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">Target Destination</label>
                <select
                  value={targetType}
                  onChange={(e) => setTargetType(e.target.value as any)}
                  className="w-full p-2 bg-white rounded-lg border border-slate-200 font-medium"
                >
                  <option value="subject">Course Subject / Topic</option>
                  <option value="deck">Standalone Deck</option>
                </select>
              </div>

              {targetType === 'subject' && (
                <>
                  <div>
                    <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">Subject</label>
                    <select
                      value={selectedSubjectId}
                      onChange={(e) => {
                        setSelectedSubjectId(e.target.value);
                        setSelectedTopicId('');
                      }}
                      className="w-full p-2 bg-white rounded-lg border border-slate-200 font-medium"
                    >
                      <option value="">-- General Course Level --</option>
                      {subjects.map((s) => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">Topic</label>
                    <select
                      value={selectedTopicId}
                      onChange={(e) => setSelectedTopicId(e.target.value)}
                      className="w-full p-2 bg-white rounded-lg border border-slate-200 font-medium"
                    >
                      <option value="">-- All Topics / General --</option>
                      {subjects
                        .find((s) => s.id === selectedSubjectId)
                        ?.topics.map((t) => (
                          <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                    </select>
                  </div>
                </>
              )}

              {targetType === 'deck' && (
                <div className="sm:col-span-2">
                  <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">Select Deck</label>
                  <select
                    value={selectedDeckId}
                    onChange={(e) => setSelectedDeckId(e.target.value)}
                    className="w-full p-2 bg-white rounded-lg border border-slate-200 font-medium"
                  >
                    <option value="">-- Select Standalone Deck --</option>
                    {decks.map((d) => (
                      <option key={d.id} value={d.id}>{d.title}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* CSV Input: File Upload or Raw Paste */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Upload CSV File or Paste Raw Text
                </label>
                <label className="text-xs font-bold text-brand-teal hover:underline cursor-pointer flex items-center space-x-1">
                  <Upload className="w-3.5 h-3.5" />
                  <span>Choose CSV File</span>
                  <input type="file" accept=".csv,text/csv,text/plain" onChange={handleFileUpload} className="hidden" />
                </label>
              </div>

              <textarea
                rows={4}
                value={rawCSV}
                onChange={(e) => {
                  setRawCSV(e.target.value);
                  if (e.target.value.length > 10) {
                    triggerPreview(e.target.value, customDelimiter, mapping);
                  }
                }}
                placeholder="id,question,choices,answerKey OR front,back,tags..."
                className="w-full p-3 font-mono text-xs rounded-xl border border-slate-200 focus:border-brand-teal focus:ring-2 focus:ring-brand-teal/20 outline-none"
              />
            </div>

            {/* Delimiter & Column Mapping Controls */}
            {headers.length > 0 && (
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200 text-xs">
                  <div className="font-bold text-slate-800">
                    Detected Delimiter: <span className="font-mono bg-white px-2 py-0.5 rounded border">{previewStats?.detectedDelimiter === '\t' ? 'TAB' : previewStats?.detectedDelimiter}</span>
                  </div>

                  <div className="flex items-center space-x-2">
                    <span className="text-slate-500 font-semibold">Override Delimiter:</span>
                    <select
                      value={customDelimiter}
                      onChange={(e) => {
                        setCustomDelimiter(e.target.value);
                        triggerPreview(rawCSV, e.target.value, mapping);
                      }}
                      className="p-1 bg-white border border-slate-200 rounded text-xs font-mono"
                    >
                      <option value="">Auto-Detect</option>
                      <option value=",">Comma (,)</option>
                      <option value=";">Semicolon (;)</option>
                      <option value="&#9;">Tab (\t)</option>
                      <option value="|">Pipe (|)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">Front / Question *</label>
                    <select
                      value={mapping.front}
                      onChange={(e) => {
                        const m = { ...mapping, front: e.target.value };
                        setMapping(m);
                        triggerPreview(rawCSV, customDelimiter, m);
                      }}
                      className="w-full p-2 bg-white rounded-lg border border-slate-200 font-semibold text-brand-teal"
                    >
                      {headers.map((h) => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">Back / Answer *</label>
                    <select
                      value={mapping.back}
                      onChange={(e) => {
                        const m = { ...mapping, back: e.target.value };
                        setMapping(m);
                        triggerPreview(rawCSV, customDelimiter, m);
                      }}
                      className="w-full p-2 bg-white rounded-lg border border-slate-200 font-semibold text-brand-emerald"
                    >
                      {headers.map((h) => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">Tags (Optional)</label>
                    <select
                      value={mapping.tags || ''}
                      onChange={(e) => {
                        const m = { ...mapping, tags: e.target.value || undefined };
                        setMapping(m);
                        triggerPreview(rawCSV, customDelimiter, m);
                      }}
                      className="w-full p-2 bg-white rounded-lg border border-slate-200"
                    >
                      <option value="">-- None --</option>
                      {headers.map((h) => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">Difficulty (Optional)</label>
                    <select
                      value={mapping.difficulty || ''}
                      onChange={(e) => {
                        const m = { ...mapping, difficulty: e.target.value || undefined };
                        setMapping(m);
                        triggerPreview(rawCSV, customDelimiter, m);
                      }}
                      className="w-full p-2 bg-white rounded-lg border border-slate-200"
                    >
                      <option value="">-- None --</option>
                      {headers.map((h) => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Preview Statistics & Table */}
            {previewStats && (
              <div className="space-y-4">
                <div className="grid grid-cols-4 gap-2 text-center text-xs">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <div className="text-lg font-extrabold text-slate-800">{previewStats.total}</div>
                    <div className="text-[10px] font-semibold text-slate-400 uppercase">Total Rows</div>
                  </div>
                  <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                    <div className="text-lg font-extrabold text-emerald-700">{previewStats.valid}</div>
                    <div className="text-[10px] font-semibold text-emerald-600 uppercase">Valid Ready</div>
                  </div>
                  <div className="p-3 bg-amber-50 rounded-xl border border-amber-200">
                    <div className="text-lg font-extrabold text-amber-700">{previewStats.duplicates}</div>
                    <div className="text-[10px] font-semibold text-amber-600 uppercase">Duplicates</div>
                  </div>
                  <div className="p-3 bg-red-50 rounded-xl border border-red-200">
                    <div className="text-lg font-extrabold text-red-700">{previewStats.errors}</div>
                    <div className="text-[10px] font-semibold text-red-600 uppercase">Malformed</div>
                  </div>
                </div>

                <div className="border border-slate-200 rounded-xl overflow-hidden max-h-48 overflow-y-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 text-slate-600 sticky top-0 font-bold">
                      <tr>
                        <th className="p-2">Row</th>
                        <th className="p-2">Front Preview</th>
                        <th className="p-2">Back Preview</th>
                        <th className="p-2">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {previewCards.slice(0, 15).map((card) => (
                        <tr key={card.rowIndex} className="hover:bg-slate-50">
                          <td className="p-2 font-mono text-slate-400">#{card.rowIndex}</td>
                          <td className="p-2 truncate max-w-[200px] font-medium text-slate-800">{card.front}</td>
                          <td className="p-2 truncate max-w-[200px] text-slate-600">{card.back}</td>
                          <td className="p-2">
                            {card.isValid ? (
                              card.isDuplicate ? (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">Duplicate</span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">Valid</span>
                              )
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-800">{card.validationError}</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Export Data */}
        {activeTab === 'export' && (
          <div className="space-y-6 py-4">
            <div className="p-4 bg-brand-sage/15 rounded-2xl border border-brand-sage/30 text-xs text-brand-navy">
              <span className="font-bold">Export Portability:</span> Recallia exports clean CSV files that are 100% round-trip compatible with the importer, and structured JSON backups for complete course preservation.
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1.5">Export Scope</label>
                <div className="grid grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => setExportScope('all')}
                    className={`p-3 rounded-xl border text-left font-bold transition ${
                      exportScope === 'all' ? 'border-brand-teal bg-teal-50/50 text-brand-dark' : 'border-slate-200'
                    }`}
                  >
                    Entire Question Bank
                  </button>
                  <button
                    type="button"
                    onClick={() => setExportScope('subject')}
                    className={`p-3 rounded-xl border text-left font-bold transition ${
                      exportScope === 'subject' ? 'border-brand-teal bg-teal-50/50 text-brand-dark' : 'border-slate-200'
                    }`}
                  >
                    Specific Subject
                  </button>
                  <button
                    type="button"
                    onClick={() => setExportScope('deck')}
                    className={`p-3 rounded-xl border text-left font-bold transition ${
                      exportScope === 'deck' ? 'border-brand-teal bg-teal-50/50 text-brand-dark' : 'border-slate-200'
                    }`}
                  >
                    Standalone Deck
                  </button>
                </div>
              </div>

              {exportScope === 'subject' && (
                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">Select Subject</label>
                  <select
                    value={exportSubjectId}
                    onChange={(e) => setExportSubjectId(e.target.value)}
                    className="w-full p-2.5 bg-white rounded-xl border border-slate-200"
                  >
                    <option value="">-- Choose Subject --</option>
                    {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              )}

              {exportScope === 'deck' && (
                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">Select Deck</label>
                  <select
                    value={exportDeckId}
                    onChange={(e) => setExportDeckId(e.target.value)}
                    className="w-full p-2.5 bg-white rounded-xl border border-slate-200"
                  >
                    <option value="">-- Choose Deck --</option>
                    {decks.map((d) => <option key={d.id} value={d.id}>{d.title}</option>)}
                  </select>
                </div>
              )}

              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1.5">File Format</label>
                <div className="flex space-x-4">
                  <label className="flex items-center space-x-2 font-semibold text-slate-700 cursor-pointer">
                    <input
                      type="radio"
                      name="format"
                      value="csv"
                      checked={exportFormat === 'csv'}
                      onChange={() => setExportFormat('csv')}
                    />
                    <span>Standard CSV Format</span>
                  </label>
                  <label className="flex items-center space-x-2 font-semibold text-slate-700 cursor-pointer">
                    <input
                      type="radio"
                      name="format"
                      value="json"
                      checked={exportFormat === 'json'}
                      onChange={() => setExportFormat('json')}
                    />
                    <span>Structured JSON Backup</span>
                  </label>
                </div>
              </div>

              <div className="pt-4">
                <button
                  type="button"
                  disabled={isExporting}
                  onClick={handleExportDownload}
                  className="px-6 py-3 rounded-xl font-bold text-white bg-brand-teal hover:bg-brand-navy shadow-soft flex items-center space-x-2 transition disabled:opacity-50"
                >
                  <Download className="w-4 h-4" />
                  <span>Download {exportFormat.toUpperCase()} Export File</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: JSON Restore */}
        {activeTab === 'restore' && (
          <form onSubmit={handleRestoreSubmit} className="space-y-4 py-4 text-xs">
            {restoreMessage && (
              <div
                className={`p-3 rounded-xl font-semibold flex items-center space-x-2 ${
                  restoreMessage.error ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                }`}
              >
                {restoreMessage.error ? <AlertCircle className="w-4 h-4 shrink-0" /> : <CheckCircle2 className="w-4 h-4 shrink-0" />}
                <span>{restoreMessage.text}</span>
              </div>
            )}

            <div>
              <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Paste JSON Backup Content
              </label>
              <textarea
                rows={8}
                value={restoreJSON}
                onChange={(e) => setRestoreJSON(e.target.value)}
                placeholder='{"version": 1, "product": "Recallia", "cards": [...]}'
                className="w-full p-3 font-mono text-xs rounded-xl border border-slate-200 focus:border-brand-teal focus:ring-2 focus:ring-brand-teal/20 outline-none"
              />
            </div>

            <div className="flex justify-end space-x-3 pt-2">
              <button
                type="submit"
                disabled={isRestoring || !restoreJSON.trim()}
                className="px-6 py-2.5 font-bold text-white bg-brand-emerald hover:bg-teal-700 rounded-xl shadow-soft transition disabled:opacity-50"
              >
                {isRestoring ? 'Restoring...' : 'Restore JSON Backup'}
              </button>
            </div>
          </form>
        )}

        {/* Bottom Actions for Import Tab */}
        {activeTab === 'import' && (
          <div className="pt-4 border-t border-slate-100 flex justify-between items-center">
            <span className="text-xs text-slate-500">
              {previewStats ? `${previewStats.valid} valid cards will be imported` : 'Ready to parse CSV data'}
            </span>

            <div className="flex space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition"
              >
                Close
              </button>
              <button
                type="button"
                disabled={isCommitting || !previewStats || previewStats.valid === 0}
                onClick={handleCommitImport}
                className="px-5 py-2 text-xs font-bold text-white bg-brand-emerald hover:bg-teal-700 rounded-xl shadow-soft transition disabled:opacity-50 flex items-center space-x-2"
              >
                <span>{isCommitting ? 'Importing Cards...' : 'Commit Import'}</span>
                <CheckCircle2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
