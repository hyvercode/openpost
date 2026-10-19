const fs = require('fs');
let code = fs.readFileSync('src/components/DeploymentPanel.tsx', 'utf8');

const replacement = `
                    <button
                      onClick={copyToClipboard}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--border-strong)] bg-[var(--bg-base)] hover:bg-[var(--bg-hover)] text-[var(--text-primary)] text-xs font-semibold transition-all"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      Copy URL
                    </button>
                    <button
                      onClick={async () => {
                        const newVis = (deployment.mockVisibility || 'private') === 'public' ? 'private' : 'public';
                        try {
                          const updated = await apiService.updateDeployment(deployment.id, { mockVisibility: newVis });
                          setDeployments(deployments.map(d => d.id === deployment.id ? updated : d));
                          addToast(\`Mock server visibility set to \${newVis}\`, 'success');
                        } catch (e) {
                          addToast('Failed to update visibility', 'error');
                        }
                      }}
                      className={\`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold uppercase tracking-wider transition-all \${(deployment.mockVisibility || 'private') === 'public' ? 'bg-green-500/10 text-green-500 border-green-500/20' : 'bg-gray-500/10 text-gray-500 border-gray-500/20'}\`}
                    >
                      {(deployment.mockVisibility || 'private') === 'public' ? <Globe className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                      {(deployment.mockVisibility || 'private') === 'public' ? 'Public' : 'Private'}
                    </button>
                  </div>
`;

code = code.replace(/<button\s*onClick=\{copyToClipboard\}[\s\S]*?Copy URL\n\s*<\/button>\n\s*<\/div>/, replacement);

if (code.includes('Globe')) {
  // Good, but let's make sure Globe and Lock are imported.
  if (!code.includes('Globe,')) {
    code = code.replace(/import \{.*?\} from 'lucide-react';/, (match) => {
      return match.replace('}', ', Globe, Lock }');
    });
  }
}

fs.writeFileSync('src/components/DeploymentPanel.tsx', code);
