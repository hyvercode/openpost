const fs = require('fs');
let app = fs.readFileSync('src/App.tsx', 'utf8');

if (!app.includes('isAgentModalOpen')) {
    app = app.replace(
        "const [isWorkspaceMembersModalOpen, setIsWorkspaceMembersModalOpen] = useState(false);",
        "const [isWorkspaceMembersModalOpen, setIsWorkspaceMembersModalOpen] = useState(false);\n  const [isAgentModalOpen, setIsAgentModalOpen] = useState(false);"
    );
    fs.writeFileSync('src/App.tsx', app, 'utf8');
    console.log("Fixed isAgentModalOpen state.");
} else {
    console.log("State already exists.");
}
