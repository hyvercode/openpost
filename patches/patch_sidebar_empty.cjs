const fs = require('fs');
let code = fs.readFileSync('src/components/Sidebar.tsx', 'utf8');

const oldEmptyCollections = `{filteredCollections.length === 0 && (
              <div className="text-center p-4 text-sm text-[var(--text-secondary)]">
                {searchQuery ? "No results found." : "No collections. Click the Upload icon above to import data."}
              </div>
            )}`;

const newEmptyCollections = `{filteredCollections.length === 0 && (
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
                      <Folder className="w-6 h-6 text-[var(--primary)] opacity-80" />
                    </div>
                    <p className="text-sm font-bold text-[var(--text-primary)] mb-1">It's empty here</p>
                    <p className="text-xs opacity-70 mb-6 leading-relaxed px-2">Create a collection to organize your requests, or import from OpenAPI/Postman.</p>
                    <div className="flex flex-col gap-2 w-full max-w-[200px]">
                      <button 
                        onClick={() => setModal({ isOpen: true, title: 'New Collection', type: 'collection' })}
                        className="flex items-center justify-center gap-2 px-3 py-2 bg-[var(--primary)] text-white rounded text-xs font-bold hover:opacity-90 transition-opacity"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Create Collection
                      </button>
                      <button 
                        onClick={() => setIsOpenApiModalOpen(true)}
                        className="flex items-center justify-center gap-2 px-3 py-2 bg-[var(--bg-hover)] text-[var(--text-primary)] border border-[var(--border-strong)] rounded text-xs font-bold hover:bg-[var(--bg-surface)] transition-all"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        Import OpenAPI
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}`;

code = code.replace(oldEmptyCollections, newEmptyCollections);

fs.writeFileSync('src/components/Sidebar.tsx', code);
