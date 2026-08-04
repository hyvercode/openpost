const fs = require('fs');
let code = fs.readFileSync('src/components/RequestPanel.tsx', 'utf8');

const emptyState = `
  if (!activeRequest) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-[var(--bg-panel)] relative text-center px-4">
        <div className="w-20 h-20 bg-[var(--bg-hover)] rounded-full flex items-center justify-center mb-6 shadow-sm border border-[var(--border-subtle)]">
          <TerminalSquare className="w-10 h-10 text-[var(--primary)] opacity-80" />
        </div>
        <h2 className="text-xl font-bold text-[var(--text-primary)] mb-2">No Request Selected</h2>
        <p className="text-sm text-[var(--text-secondary)] max-w-md mb-8 leading-relaxed">
          Select a request from the sidebar, or create a new one to start testing your APIs. You can also import existing collections.
        </p>
        <div className="flex gap-4">
          <button
            onClick={() => useStore.getState().setModal({ isOpen: true, title: 'New Request', type: 'request' })}
            className="flex items-center gap-2 px-5 py-2.5 bg-[var(--primary)] text-white rounded-lg text-sm font-bold shadow-md shadow-[var(--primary)]/20 hover:opacity-90 hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            <Plus className="w-4 h-4" />
            Create Request
          </button>
          <button
            onClick={() => setIsCurlModalOpen(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-[var(--bg-hover)] text-[var(--text-primary)] border border-[var(--border-strong)] rounded-lg text-sm font-bold hover:bg-[var(--bg-surface)] hover:border-[var(--text-secondary)] transition-all"
          >
            <Code2 className="w-4 h-4" />
            Import cURL
          </button>
        </div>
        
        {isCurlModalOpen && <CurlImportModal isOpen={isCurlModalOpen} onClose={() => setIsCurlModalOpen(false)} onImport={handleCurlImport} />}
      </div>
    );
  }
`;

code = code.replace("  return (\n    <motion.div \n      key={activeRequest?.id || 'empty'}", emptyState + "\n  return (\n    <motion.div \n      key={activeRequest?.id || 'empty'}");

fs.writeFileSync('src/components/RequestPanel.tsx', code);
