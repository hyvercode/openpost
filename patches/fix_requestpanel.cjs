const fs = require('fs');
let content = fs.readFileSync('src/components/RequestPanel.tsx', 'utf8');

// Extract gqlDictionary
const dictRegex = /  const gqlDictionary = React\.useMemo\(\(\) => \{\n(?:.|\n)*?  \}, \[introspectionSchema\]\);\n/;
const match = content.match(dictRegex);

if (match) {
  content = content.replace(dictRegex, '');
  
  // Find introspectionSchema declaration
  const targetRegex = /  const \[introspectionSchema, setIntrospectionSchema\] = useState<any>\(null\);\n/;
  content = content.replace(targetRegex, matchStr => matchStr + '\n' + match[0].replace(/React\.useMemo/g, 'useMemo'));
  
  // Also import useMemo if missing
  if (!content.includes('useMemo')) {
    content = content.replace(/import \{ useState, useEffect, useRef \} from 'react';/, "import { useState, useEffect, useRef, useMemo } from 'react';");
  } else {
    content = content.replace(/import \{ ([^}]+) \} from 'react';/, (m, p1) => {
      if (!p1.includes('useMemo')) {
        return `import { ${p1}, useMemo } from 'react';`;
      }
      return m;
    });
  }
  
  fs.writeFileSync('src/components/RequestPanel.tsx', content);
  console.log('Fixed');
} else {
  console.log('Not found');
}
