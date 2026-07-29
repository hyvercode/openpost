const fs = require('fs');
let content = fs.readFileSync('src/components/Sidebar.tsx', 'utf8');

content = content.replace(
  "const [activeTab, setActiveTab] = useState<'collections' | 'environments' | 'deployments' | 'history' | 'tests'>('collections');",
  "const [activeTab, setActiveTab] = useState<'collections' | 'environments' | 'deployments' | 'history' | 'tests' | 'cookies'>('collections');"
);

fs.writeFileSync('src/components/Sidebar.tsx', content);
console.log('Fixed Sidebar type');
