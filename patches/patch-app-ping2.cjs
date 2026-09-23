const fs = require('fs');

let app = fs.readFileSync('src/App.tsx', 'utf8');

if (!app.includes('useAgentPing();')) {
    app = app.replace(
        "export default function App() {",
        "export default function App() {\n  useAgentPing();"
    );
    
    fs.writeFileSync('src/App.tsx', app, 'utf8');
    console.log("App.tsx patched with useAgentPing call.");
} else {
    console.log("App.tsx already calls useAgentPing.");
}
