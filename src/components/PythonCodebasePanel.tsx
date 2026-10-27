import React, { useState } from 'react';
import { PYTHON_CODEBASE_FILES } from '../solver/pythonBundle';

export const PythonCodebasePanel: React.FC = () => {
  const [selectedIdx, setSelectedIdx] = useState<number>(0);
  const [copiedFile, setCopiedFile] = useState<string | null>(null);

  const activeFile = PYTHON_CODEBASE_FILES[selectedIdx];

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(activeFile.content);
      setCopiedFile(activeFile.filename);
      setTimeout(() => setCopiedFile(null), 2000);
    } catch {
      // Fallback handled silently
    }
  };

  const handleDownload = () => {
    const blob = new Blob([activeFile.content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = activeFile.filename.replace('/', '_');
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-5 py-4 border-b border-slate-200 bg-slate-50">
        <div className="flex flex-wrap items-center gap-1.5">
          {PYTHON_CODEBASE_FILES.map((file, idx) => (
            <button
              key={file.filename}
              type="button"
              onClick={() => setSelectedIdx(idx)}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-colors whitespace-nowrap ${
                selectedIdx === idx
                  ? 'bg-indigo-600 text-white font-semibold'
                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              {file.filename}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleCopy}
            className="px-3 py-1.5 rounded-lg bg-white border border-slate-300 hover:bg-slate-100 text-xs font-semibold text-slate-700 transition-colors whitespace-nowrap"
          >
            {copiedFile === activeFile.filename ? 'Copied to Clipboard' : `Copy ${activeFile.filename}`}
          </button>
          <button
            type="button"
            onClick={handleDownload}
            className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white transition-colors whitespace-nowrap"
          >
            Download File
          </button>
        </div>
      </div>

      <div className="px-5 py-3 bg-white border-b border-slate-200 flex items-center justify-between text-xs text-slate-600">
        <span>{activeFile.description}</span>
        <span className="font-mono text-slate-700 shrink-0 ml-4">Path: {activeFile.path}</span>
      </div>

      <pre className="p-5 text-xs font-mono text-slate-100 bg-slate-900 overflow-x-auto max-h-[65vh] leading-relaxed">
        <code>{activeFile.content}</code>
      </pre>
    </div>
  );
};
