const fs = require('fs');

let app = fs.readFileSync('src/App.tsx', 'utf8');

if (!app.includes('useAgentPing')) {
    app = app.replace(
        "import { useStore } from './store/useStore';",
        "import { useStore } from './store/useStore';\nimport { useAgentPing } from './hooks/useAgentPing';"
    );
    
    app = app.replace(
        "export function App() {",
        "export function App() {\n  useAgentPing();"
    );
    
    fs.writeFileSync('src/App.tsx', app, 'utf8');
    console.log("App.tsx patched with useAgentPing.");
} else {
    console.log("App.tsx already uses useAgentPing.");
}
