const fs = require('fs');

// Patch App.tsx
let appCode = fs.readFileSync('src/App.tsx', 'utf8');
appCode = appCode.replace(/apiService\.getSharedCollection\(docId\)/, "apiService.getSharedCollection(docId, 'doc')");
fs.writeFileSync('src/App.tsx', appCode);

// ShareImportModal doesn't need changes because default is 'import'. But just in case:
let shareCode = fs.readFileSync('src/components/ShareImportModal.tsx', 'utf8');
shareCode = shareCode.replace(/apiService\.getSharedCollection\(targetColId\)/, "apiService.getSharedCollection(targetColId, 'import')");
fs.writeFileSync('src/components/ShareImportModal.tsx', shareCode);

