const fs = require('fs');
let store = fs.readFileSync('src/store/useStore.ts', 'utf8');

if (!store.includes("agentMode:")) {
    store = store.replace(
        `layoutMode: 'horizontal' | 'vertical' | 'floating';`,
        `layoutMode: 'horizontal' | 'vertical' | 'floating';\n  agentMode: 'cloud' | 'desktop';\n  setAgentMode: (mode: 'cloud' | 'desktop') => void;`
    );

    store = store.replace(
        `layoutMode: (localStorage.getItem('layoutMode') as 'horizontal' | 'vertical' | 'floating') || 'horizontal',`,
        `layoutMode: (localStorage.getItem('layoutMode') as 'horizontal' | 'vertical' | 'floating') || 'horizontal',\n  agentMode: (localStorage.getItem('agentMode') as 'cloud' | 'desktop') || 'cloud',\n  setAgentMode: (agentMode) => {\n    localStorage.setItem('agentMode', agentMode);\n    set({ agentMode });\n  },`
    );

    fs.writeFileSync('src/store/useStore.ts', store, 'utf8');
    console.log("Patched store.");
} else {
    console.log("Store already has agentMode.");
}
