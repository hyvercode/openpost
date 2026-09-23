const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// 1. Import HelpGuideModal and HelpCircle
code = code.replace(
  "import { QuickSearchModal } from './components/QuickSearchModal';",
  "import { QuickSearchModal } from './components/QuickSearchModal';\nimport { HelpGuideModal } from './components/HelpGuideModal';"
);

code = code.replace(
  "import { LogOut, Cloud, MonitorSmartphone, Download,",
  "import { LogOut, Cloud, MonitorSmartphone, Download, HelpCircle,"
);

// 2. Destructure isHelpModalOpen / setIsHelpModalOpen
code = code.replace(
  "isQuickSearchOpen,\n    setIsQuickSearchOpen",
  "isQuickSearchOpen,\n    setIsQuickSearchOpen,\n    setIsHelpModalOpen"
);

// 3. Add Help Button in header
const agentGroupEnd = `<button
                onClick={() => setIsAgentModalOpen(true)}
                className="p-1.5 rounded-md hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all flex items-center justify-center"
                title="Download Desktop Agent Bridge & Instructions"
              >
                <Download className="w-4 h-4" />
              </button>
            </div>`;

const newAgentGroupEnd = `<button
                onClick={() => setIsAgentModalOpen(true)}
                className="p-1.5 rounded-md hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all flex items-center justify-center"
                title="Download Desktop Agent Bridge & Instructions"
              >
                <Download className="w-4 h-4" />
              </button>
              <div className="h-3.5 w-px bg-[var(--border-subtle)]" />
              <button
                onClick={() => setIsHelpModalOpen(true)}
                className="p-1.5 rounded-md hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:text-[var(--primary)] transition-all flex items-center justify-center"
                title="Open Documentation & Feature Guide"
              >
                <HelpCircle className="w-4 h-4" />
              </button>
            </div>`;

code = code.replace(agentGroupEnd, newAgentGroupEnd);

// 4. Render HelpGuideModal at bottom
code = code.replace("<QuickSearchModal />", "<QuickSearchModal />\n      <HelpGuideModal />");

fs.writeFileSync('src/App.tsx', code);
