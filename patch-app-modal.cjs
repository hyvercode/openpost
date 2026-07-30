const fs = require('fs');

let app = fs.readFileSync('src/App.tsx', 'utf8');

// Add import for AgentDownloadModal
if (!app.includes('AgentDownloadModal')) {
    app = app.replace(
        "import { CurlImportModal } from './components/CurlImportModal';",
        "import { CurlImportModal } from './components/CurlImportModal';\nimport { AgentDownloadModal } from './components/AgentDownloadModal';"
    );
}

if (!app.includes('Download,')) {
    app = app.replace(
        "import { LogOut, Cloud, MonitorSmartphone",
        "import { LogOut, Cloud, MonitorSmartphone, Download"
    );
}

// Add state for modal
if (!app.includes('isAgentModalOpen')) {
    app = app.replace(
        "const [isWorkspaceMembersModalOpen, setIsWorkspaceMembersModalOpen] = useState(false);",
        "const [isWorkspaceMembersModalOpen, setIsWorkspaceMembersModalOpen] = useState(false);\n  const [isAgentModalOpen, setIsAgentModalOpen] = useState(false);"
    );
}

// Add download button next to the Agent toggle
const toggleCode = `<span className="sm:hidden">{agentMode === 'cloud' ? 'Cloud' : 'Local'}</span>
            </button>`;

const newToggleCode = `<span className="sm:hidden">{agentMode === 'cloud' ? 'Cloud' : 'Local'}</span>
            </button>
            <button
              onClick={() => setIsAgentModalOpen(true)}
              className="flex items-center gap-1.5 px-2 py-1 rounded border border-[var(--border-subtle)] bg-[var(--bg-hover)] hover:bg-[var(--primary)] hover:text-white hover:border-[var(--primary)] text-xs font-semibold text-[var(--text-primary)] transition-all cursor-pointer group shadow-2xs"
              title="Download Desktop Agent Bridge"
            >
              <Download className="w-3.5 h-3.5 text-[var(--icon-color)] group-hover:text-white transition-colors" />
            </button>`;

app = app.replace(toggleCode, newToggleCode);

// Add modal component at the end of the file
const modalsEnd = `<CurlImportModal 
        isOpen={isCurlImportModalOpen} 
        onClose={() => setIsCurlImportModalOpen(false)} 
      />`;

const newModalsEnd = `<CurlImportModal 
        isOpen={isCurlImportModalOpen} 
        onClose={() => setIsCurlImportModalOpen(false)} 
      />
      
      <AgentDownloadModal
        isOpen={isAgentModalOpen}
        onClose={() => setIsAgentModalOpen(false)}
      />`;

app = app.replace(modalsEnd, newModalsEnd);

fs.writeFileSync('src/App.tsx', app, 'utf8');
console.log("App.tsx patched with AgentDownloadModal.");
