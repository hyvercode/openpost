const fs = require('fs');
let app = fs.readFileSync('src/App.tsx', 'utf8');

if (!app.includes('agentMode,')) {
    app = app.replace(
        `setLayoutMode,`,
        `setLayoutMode,\n    agentMode,\n    setAgentMode,`
    );
}

if (!app.includes("MonitorSmartphone") && !app.includes("Cloud")) {
    app = app.replace(
        `import { LogOut, MonitorSmartphone, Sun, Moon`,
        `import { LogOut, Cloud, MonitorSmartphone, Sun, Moon`
    );
}

const toggleCode = `            <div className="h-4 w-px bg-[var(--border-strong)] hidden sm:block"></div>
            <button
              onClick={() => {
                setAgentMode(agentMode === 'cloud' ? 'desktop' : 'cloud');
                addToast(agentMode === 'cloud' ? 'Switched to Desktop Agent for local requests' : 'Switched to Cloud Agent', 'success', 2000);
              }}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded border border-[var(--border-subtle)] bg-[var(--bg-hover)] hover:bg-[var(--primary)] hover:text-white hover:border-[var(--primary)] text-xs font-semibold text-[var(--text-primary)] transition-all cursor-pointer group shadow-2xs"
              title={agentMode === 'cloud' ? 'Using Cloud Agent (Cannot reach localhost)' : 'Using Desktop Agent (Can reach localhost via Bridge)'}
            >
              {agentMode === 'cloud' ? (
                <Cloud className="w-3.5 h-3.5 text-[var(--primary)] group-hover:text-white transition-colors" />
              ) : (
                <MonitorSmartphone className="w-3.5 h-3.5 text-emerald-500 group-hover:text-white transition-colors" />
              )}
              <span className="hidden sm:inline">{agentMode === 'cloud' ? 'Cloud Agent' : 'Desktop Agent'}</span>
              <span className="sm:hidden">{agentMode === 'cloud' ? 'Cloud' : 'Local'}</span>
            </button>`;

if (!app.includes('Desktop Agent')) {
    app = app.replace(
        `<span className="hidden sm:inline">Sync Workspace</span>
              <span className="sm:hidden">Sync</span>
            </button>`,
        `<span className="hidden sm:inline">Sync Workspace</span>
              <span className="sm:hidden">Sync</span>
            </button>
${toggleCode}`
    );
    fs.writeFileSync('src/App.tsx', app, 'utf8');
    console.log("Patched App.tsx.");
} else {
    console.log("App.tsx already patched.");
}
