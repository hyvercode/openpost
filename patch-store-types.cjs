const fs = require('fs');
let store = fs.readFileSync('src/store/useStore.ts', 'utf8');

if (!store.includes('CollectionRunReport')) {
    store = store.replace(
        "import { User, Workspace, ApiCollection, Environment, RequestItem, LogEntry, IssueItem, Deployment, Toast, Theme, HistoryItem, TestSuite, WsMessage, ProxyConfig, CookieItem } from \"../types\";",
        "import { User, Workspace, ApiCollection, Environment, RequestItem, LogEntry, IssueItem, Deployment, Toast, Theme, HistoryItem, TestSuite, WsMessage, ProxyConfig, CookieItem, CollectionRunReport } from \"../types\";"
    );
    
    store = store.replace(
        "bulkRunReport: any | null;",
        "bulkRunReport: CollectionRunReport | null;"
    );
    
    store = store.replace(
        "setBulkRunReport: (report: any | null) => void;",
        "setBulkRunReport: (report: CollectionRunReport | null) => void;"
    );
    
    fs.writeFileSync('src/store/useStore.ts', store, 'utf8');
    console.log("Store updated to use CollectionRunReport.");
}
