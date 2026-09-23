const fs = require('fs');
let code = fs.readFileSync('src/components/Sidebar.tsx', 'utf8');

// Replace the Share Collection Link button behavior
code = code.replace(/const shareUrl = \`\$\{window\.location\.origin\}\?share_type=collection\&share_id=\$\{collection\.id\}\`;\s*navigator\.clipboard\.writeText\(shareUrl\);\s*addToast\('Collection share link copied to clipboard!', 'success', 2500\);/g,
`setModal({ isOpen: true, title: 'Share Settings', type: 'share_settings', targetId: collection.id });`);

// Update "Share Collection Link" text to "Share Settings"
code = code.replace(/<span className="font-semibold text-emerald-500">Share Collection Link<\/span>/g,
`<span className="font-semibold text-emerald-500">Share / Visibility Settings</span>`);

fs.writeFileSync('src/components/Sidebar.tsx', code);
