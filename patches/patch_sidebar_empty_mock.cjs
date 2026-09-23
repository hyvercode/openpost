const fs = require('fs');
let code = fs.readFileSync('src/components/Sidebar.tsx', 'utf8');

const oldEmptyMock = `{deployments.length === 0 && (
              <div className="text-center p-4 text-xs text-[var(--text-secondary)]">
                No mock servers deployed. Deploy a collection to start!
              </div>
            )}`;

const newEmptyMock = `{deployments.length === 0 && (
              <div className="flex flex-col items-center justify-center p-6 text-center text-[var(--text-secondary)] mt-8">
                <div className="w-12 h-12 rounded-full bg-[var(--bg-hover)] flex items-center justify-center mb-4">
                  <Cloud className="w-6 h-6 text-[var(--primary)] opacity-80" />
                </div>
                <p className="text-sm font-bold text-[var(--text-primary)] mb-1">No Mock Servers</p>
                <p className="text-xs opacity-70 mb-6 leading-relaxed px-2">Deploy a collection to create a mock API server that your frontend can connect to.</p>
                <div className="flex flex-col gap-2 w-full max-w-[200px]">
                  <button 
                    onClick={() => setActiveView('deployments')}
                    className="flex items-center justify-center gap-2 px-3 py-2 bg-[var(--primary)] text-white rounded text-xs font-bold hover:opacity-90 transition-opacity"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Create Mock Server
                  </button>
                </div>
              </div>
            )}`;

code = code.replace(oldEmptyMock, newEmptyMock);
fs.writeFileSync('src/components/Sidebar.tsx', code);
