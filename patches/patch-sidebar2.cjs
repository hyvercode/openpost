const fs = require('fs');
let code = fs.readFileSync('src/components/Sidebar.tsx', 'utf8');

const shareSettingsModal = `
      {modal.type === 'share_settings' && (
        <ShareSettingsModal 
          isOpen={modal.isOpen}
          collectionId={modal.targetId!}
          onClose={() => setModal({ isOpen: false, type: 'collection' })}
        />
      )}
`;

code = code.replace(/<\/div>\s*<\/div>\s*\)\;\s*\}\s*$/m, shareSettingsModal + '\n    </div>\n  </div>\n  );\n}');

code = code.replace(/import \{ PromptModal \} from '\.\/PromptModal';/, 
`import { PromptModal } from './PromptModal';\nimport { ShareSettingsModal } from './ShareSettingsModal';`);

fs.writeFileSync('src/components/Sidebar.tsx', code);
