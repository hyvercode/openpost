const fs = require('fs');

let panel = fs.readFileSync('src/components/TestRunnerPanel.tsx', 'utf8');

// replace ExecutedTestStep and CollectionRunReport exports
if (panel.includes('export interface ExecutedTestStep')) {
    panel = panel.replace(/export interface ExecutedTestStep \{[\s\S]*?logs: Array<\{ type: string; message: string \}>;\n\}/g, '');
}

if (panel.includes('export interface CollectionRunReport')) {
    panel = panel.replace(/export interface CollectionRunReport \{[\s\S]*?steps: ExecutedTestStep\[\];\n\}/g, '');
}

// Ensure they are imported from types
if (!panel.includes('ExecutedTestStep') || !panel.match(/import \{.*?ExecutedTestStep.*?\} from '\.\.\/types'/)) {
    panel = panel.replace(
        "import { TestSuite, TestCase, TestAssertion, RequestItem, ApiCollection, KeyValue } from '../types';",
        "import { TestSuite, TestCase, TestAssertion, RequestItem, ApiCollection, KeyValue, ExecutedTestStep, CollectionRunReport } from '../types';"
    );
}

fs.writeFileSync('src/components/TestRunnerPanel.tsx', panel, 'utf8');
console.log("TestRunnerPanel.tsx patched to use types from types.ts.");
