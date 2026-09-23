const fs = require('fs');

let store = fs.readFileSync('src/store/useStore.ts', 'utf8');

if (!store.includes('bulkRunReport')) {
    store = store.replace(
        "export interface AppState {",
        "export interface AppState {\n  bulkRunReport: any | null;\n  setBulkRunReport: (report: any | null) => void;\n  isBulkRunning: boolean;\n  setIsBulkRunning: (isRunning: boolean) => void;\n  bulkRunStopRequested: boolean;\n  setBulkRunStopRequested: (stop: boolean) => void;"
    );
    
    store = store.replace(
        "export const useStore = create<AppState>((set) => ({",
        "export const useStore = create<AppState>((set) => ({\n  bulkRunReport: null,\n  setBulkRunReport: (report) => set({ bulkRunReport: report }),\n  isBulkRunning: false,\n  setIsBulkRunning: (isRunning) => set({ isBulkRunning: isRunning }),\n  bulkRunStopRequested: false,\n  setBulkRunStopRequested: (stop) => set({ bulkRunStopRequested: stop }),"
    );
    
    fs.writeFileSync('src/store/useStore.ts', store, 'utf8');
    console.log("Store updated with bulk run state.");
}
