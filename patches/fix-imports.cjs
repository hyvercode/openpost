const fs = require('fs');
let app = fs.readFileSync('src/App.tsx', 'utf8');

// Add Cloud and Download if missing
if (!app.includes('Cloud,')) {
    app = app.replace(
        "import { LogOut, MonitorSmartphone",
        "import { LogOut, Cloud, MonitorSmartphone, Download"
    );
}
if (!app.includes('Download,')) {
    app = app.replace(
        "import { LogOut, Cloud, MonitorSmartphone",
        "import { LogOut, Cloud, MonitorSmartphone, Download"
    );
}

// Ensure AgentDownloadModal is imported
if (!app.includes('AgentDownloadModal')) {
    app = app.replace(
        "import { CurlImportModal } from './components/CurlImportModal';",
        "import { CurlImportModal } from './components/CurlImportModal';\nimport { AgentDownloadModal } from './components/AgentDownloadModal';"
    );
}

// Add state for isAgentModalOpen if missing
if (!app.includes('isAgentModalOpen')) {
    app = app.replace(
        "const [isWorkspaceMembersModalOpen, setIsWorkspaceMembersModalOpen] = useState(false);",
        "const [isWorkspaceMembersModalOpen, setIsWorkspaceMembersModalOpen] = useState(false);\n  const [isAgentModalOpen, setIsAgentModalOpen] = useState(false);"
    );
}

fs.writeFileSync('src/App.tsx', app, 'utf8');

let api = fs.readFileSync('src/lib/api.ts', 'utf8');
if (!api.includes("import { useStore } from '../store/useStore';")) {
    api = api.replace(
        "import axios from 'axios';",
        "import axios from 'axios';\nimport { useStore } from '../store/useStore';"
    );
}
fs.writeFileSync('src/lib/api.ts', api, 'utf8');

console.log("Fixed imports");
