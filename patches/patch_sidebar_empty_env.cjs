const fs = require('fs');
let code = fs.readFileSync('src/components/Sidebar.tsx', 'utf8');

const oldEmptyEnvs = `{filteredEnvironments.length === 0 && (
              <div className="text-center p-4 text-sm text-[var(--text-secondary)]">
                {searchQuery ? "No results found." : "No environments found."}
              </div>
            )}`;

const newEmptyEnvs = `{filteredEnvironments.length === 0 && (
              <div className="flex flex-col items-center justify-center p-6 text-center text-[var(--text-secondary)] mt-8">
                {searchQuery ? (
                  <>
                    <Search className="w-8 h-8 mb-3 opacity-20" />
                    <p className="text-sm font-medium">No results found</p>
                    <p className="text-xs opacity-70 mt-1">Try a different search term</p>
                  </>
                ) : (
                  <>
                    <div className="w-12 h-12 rounded-full bg-[var(--bg-hover)] flex items-center justify-center mb-4">
                      <Server className="w-6 h-6 text-[var(--primary)] opacity-80" />
                    </div>
                    <p className="text-sm font-bold text-[var(--text-primary)] mb-1">No environments</p>
                    <p className="text-xs opacity-70 mb-6 leading-relaxed px-2">Create an environment to manage your variables like base URLs and API keys.</p>
                    <div className="flex flex-col gap-2 w-full max-w-[200px]">
                      <button 
                        onClick={() => setModal({ isOpen: true, title: 'New Environment', type: 'environment' })}
                        className="flex items-center justify-center gap-2 px-3 py-2 bg-[var(--primary)] text-white rounded text-xs font-bold hover:opacity-90 transition-opacity"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Create Environment
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}`;

code = code.replace(oldEmptyEnvs, newEmptyEnvs);
fs.writeFileSync('src/components/Sidebar.tsx', code);
