const fs = require('fs');

let reqPanel = fs.readFileSync('src/components/RequestPanel.tsx', 'utf8');

reqPanel = reqPanel.replace(
    /const res = await api\.post\('\/proxy', \{/g,
    `const res = await api.post(useStore.getState().agentMode === 'desktop' ? 'http://127.0.0.1:8765/api/proxy' : '/proxy', {`
);

fs.writeFileSync('src/components/RequestPanel.tsx', reqPanel, 'utf8');
console.log("GraphQL Proxy calls patched!");
