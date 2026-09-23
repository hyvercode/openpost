const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// Add state for public doc
code = code.replace(/const \[loading, setLoading\] = useState\(true\);/,
`const [loading, setLoading] = useState(true);
  const [publicDocId, setPublicDocId] = useState<string | null>(null);
  const [publicDocCollection, setPublicDocCollection] = useState<ApiCollection | null>(null);
  const [publicDocError, setPublicDocError] = useState<string | null>(null);`);

// Check URL params
code = code.replace(/useEffect\(\(\) => \{\n    const fetchUser = async \(\) => \{/,
`useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const docId = params.get('public_doc');
    if (docId) {
      setPublicDocId(docId);
      setLoading(true);
      apiService.getSharedCollection(docId)
        .then(col => {
          setPublicDocCollection(col);
          setLoading(false);
        })
        .catch(err => {
          setPublicDocError('This documentation is private or does not exist.');
          setLoading(false);
        });
      return;
    }
    const fetchUser = async () => {`);

// Render public doc view
code = code.replace(/if \(loading\) \{\n    return <LoadingScreen \/>;\n  \}/,
`if (loading) {
    return <LoadingScreen />;
  }

  if (publicDocId) {
    if (publicDocError) {
      return (
        <div className="flex h-screen items-center justify-center bg-[var(--bg-base)]">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-2">Access Denied</h1>
            <p className="text-[var(--text-secondary)]">{publicDocError}</p>
          </div>
        </div>
      );
    }
    if (publicDocCollection) {
      return (
        <div className="h-screen w-screen overflow-hidden bg-[var(--bg-base)]">
          <CollectionDocPanel collection={publicDocCollection} />
        </div>
      );
    }
  }`);

fs.writeFileSync('src/App.tsx', code);
