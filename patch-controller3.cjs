const fs = require('fs');
let code = fs.readFileSync('server/src/controllers/collection.controller.ts', 'utf8');

code = code.replace(/if \(collection\.shareVisibility === 'private'\) \{/,
`const purpose = req.query.purpose || 'import';
      const isPrivate = purpose === 'doc' ? collection.docVisibility === 'private' : collection.shareVisibility === 'private';
      
      if (isPrivate) {`);

fs.writeFileSync('server/src/controllers/collection.controller.ts', code);
