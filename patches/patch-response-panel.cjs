const fs = require('fs');

let panel = fs.readFileSync('src/components/ResponsePanel.tsx', 'utf8');

if (!panel.includes('BulkRunResponsePanel')) {
    panel = panel.replace(
        "import { RequestItem, LogEntry, HistoryItem, SavedResponse } from '../types';",
        "import { RequestItem, LogEntry, HistoryItem, SavedResponse } from '../types';\nimport { BulkRunResponsePanel } from './BulkRunResponsePanel';"
    );
    
    const storeState = "const {\n    response,\n    currentRequestConfig,\n    currentEnvironment,\n    latencyHistory,\n    isRequestLoading,\n    activeRequest,\n    wsStatus,\n    wsMessages,\n    clearWsMessages,\n    isPanelHorizontal\n  } = useStore();";
    
    panel = panel.replace(
        "const { \n    response, \n    currentRequestConfig, \n    currentEnvironment, \n    latencyHistory, \n    isRequestLoading, \n    activeRequest, \n    wsStatus, \n    wsMessages, \n    clearWsMessages, \n    isPanelHorizontal \n  } = useStore();",
        "const {\n    response,\n    currentRequestConfig,\n    currentEnvironment,\n    latencyHistory,\n    isRequestLoading,\n    activeRequest,\n    wsStatus,\n    wsMessages,\n    clearWsMessages,\n    isPanelHorizontal,\n    bulkRunReport,\n    isBulkRunning\n  } = useStore();"
    );
    
    // Fallback if the strict replacement failed
    if (!panel.includes('isBulkRunning')) {
       panel = panel.replace(
         "clearWsMessages,",
         "clearWsMessages, bulkRunReport, isBulkRunning,"
       );
    }
    
    panel = panel.replace(
        "if (!activeRequest) {",
        "if (bulkRunReport || isBulkRunning) {\n    return <BulkRunResponsePanel />;\n  }\n\n  if (!activeRequest) {"
    );
    
    fs.writeFileSync('src/components/ResponsePanel.tsx', panel, 'utf8');
    console.log("ResponsePanel patched to include BulkRunResponsePanel.");
}
