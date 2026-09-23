const fs = require('fs');
let content = fs.readFileSync('src/components/AuthModal.tsx', 'utf8');

// 1. Add states
const newStates = `
  // AWS Signature V4
  const [awsAccessKey, setAwsAccessKey] = useState('');
  const [awsSecretKey, setAwsSecretKey] = useState('');
  const [awsRegion, setAwsRegion] = useState('us-east-1');
  const [awsService, setAwsService] = useState('execute-api');
  const [awsSessionToken, setAwsSessionToken] = useState('');
  const [showAwsSecret, setShowAwsSecret] = useState(false);

  // Digest Auth
  const [digestUsername, setDigestUsername] = useState('');
  const [digestPassword, setDigestPassword] = useState('');
  const [digestAlgorithm, setDigestAlgorithm] = useState('MD5');
  const [showDigestPassword, setShowDigestPassword] = useState(false);

  // Hawk Auth
  const [hawkAuthId, setHawkAuthId] = useState('');
  const [hawkAuthKey, setHawkAuthKey] = useState('');
  const [hawkAlgorithm, setHawkAlgorithm] = useState<'sha256' | 'sha1'>('sha256');
  const [hawkExt, setHawkExt] = useState('');
  const [showHawkKey, setShowHawkKey] = useState(false);
`;
content = content.replace(/  \/\/ OAuth 2\.0\n[\s\S]*?const \[showOauthSecret, setShowOauthSecret\] = useState\(false\);/, match => match + newStates);

// 2. Add to useEffect to load from props
const useEffectContent = `
    // AWS
    if (auth?.awsv4) {
      setAwsAccessKey(auth.awsv4.accessKey || '');
      setAwsSecretKey(auth.awsv4.secretKey || '');
      setAwsRegion(auth.awsv4.region || 'us-east-1');
      setAwsService(auth.awsv4.service || 'execute-api');
      setAwsSessionToken(auth.awsv4.sessionToken || '');
    }
    // Digest
    if (auth?.digest) {
      setDigestUsername(auth.digest.username || '');
      setDigestPassword(auth.digest.password || '');
      setDigestAlgorithm(auth.digest.algorithm || 'MD5');
    }
    // Hawk
    if (auth?.hawk) {
      setHawkAuthId(auth.hawk.authId || '');
      setHawkAuthKey(auth.hawk.authKey || '');
      setHawkAlgorithm(auth.hawk.algorithm || 'sha256');
      setHawkExt(auth.hawk.ext || '');
    }
`;
content = content.replace(/      setOauthAccessToken\(auth\.oauth2\.accessToken \|\| ''\);\n    }\n/, match => match + useEffectContent);

// 3. Add to handleSave
const handleSaveContent = `
      awsv4: type === 'awsv4' ? {
        accessKey: awsAccessKey,
        secretKey: awsSecretKey,
        region: awsRegion,
        service: awsService,
        sessionToken: awsSessionToken
      } : undefined,
      digest: type === 'digest' ? {
        username: digestUsername,
        password: digestPassword,
        algorithm: digestAlgorithm
      } : undefined,
      hawk: type === 'hawk' ? {
        authId: hawkAuthId,
        authKey: hawkAuthKey,
        algorithm: hawkAlgorithm,
        ext: hawkExt
      } : undefined
`;
content = content.replace(/        accessToken: oauthAccessToken\n      \} : undefined/, match => match + ',' + handleSaveContent);

// 4. Add options in dropdown
const optionsContent = `
              <option value="oauth2">OAuth 2.0 (Token Flow)</option>
              <option value="awsv4">AWS Signature V4</option>
              <option value="digest">Digest Auth</option>
              <option value="hawk">Hawk Authentication</option>
`;
content = content.replace(/<option value="oauth2">OAuth 2\.0 \(Token Flow\)<\/option>/, optionsContent);

// 5. Add UI components
const uiContent = `
          {/* AWS Signature V4 */}
          {type === 'awsv4' && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">AccessKey</label>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 w-3.5 h-3.5 text-[var(--text-secondary)]" />
                  <input
                    type="text"
                    value={awsAccessKey}
                    onChange={(e) => setAwsAccessKey(e.target.value)}
                    placeholder="AKIAIOSFODNN7EXAMPLE"
                    className="w-full bg-[var(--bg-input)] border border-[var(--border-strong)] rounded pl-9 pr-3 py-2 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--border-focus)] font-mono transition-colors"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">SecretKey</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 w-3.5 h-3.5 text-[var(--text-secondary)]" />
                  <input
                    type={showAwsSecret ? 'text' : 'password'}
                    value={awsSecretKey}
                    onChange={(e) => setAwsSecretKey(e.target.value)}
                    placeholder="wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
                    className="w-full bg-[var(--bg-input)] border border-[var(--border-strong)] rounded pl-9 pr-9 py-2 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--border-focus)] font-mono transition-colors"
                  />
                  <button
                    onClick={() => setShowAwsSecret(!showAwsSecret)}
                    className="absolute right-3 top-2.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                  >
                    {showAwsSecret ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">AWS Region</label>
                  <input
                    type="text"
                    value={awsRegion}
                    onChange={(e) => setAwsRegion(e.target.value)}
                    placeholder="us-east-1"
                    className="w-full bg-[var(--bg-input)] border border-[var(--border-strong)] rounded px-3 py-2 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--border-focus)] font-mono transition-colors"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">Service Name</label>
                  <input
                    type="text"
                    value={awsService}
                    onChange={(e) => setAwsService(e.target.value)}
                    placeholder="execute-api"
                    className="w-full bg-[var(--bg-input)] border border-[var(--border-strong)] rounded px-3 py-2 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--border-focus)] font-mono transition-colors"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">Session Token (Optional)</label>
                <div className="relative">
                  <Key className="absolute left-3 top-2.5 w-3.5 h-3.5 text-[var(--text-secondary)]" />
                  <input
                    type="text"
                    value={awsSessionToken}
                    onChange={(e) => setAwsSessionToken(e.target.value)}
                    placeholder="Session token..."
                    className="w-full bg-[var(--bg-input)] border border-[var(--border-strong)] rounded pl-9 pr-3 py-2 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--border-focus)] font-mono transition-colors"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Digest Auth */}
          {type === 'digest' && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">Username</label>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 w-3.5 h-3.5 text-[var(--text-secondary)]" />
                  <input
                    type="text"
                    value={digestUsername}
                    onChange={(e) => setDigestUsername(e.target.value)}
                    placeholder="Username"
                    className="w-full bg-[var(--bg-input)] border border-[var(--border-strong)] rounded pl-9 pr-3 py-2 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--border-focus)] font-mono transition-colors"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 w-3.5 h-3.5 text-[var(--text-secondary)]" />
                  <input
                    type={showDigestPassword ? 'text' : 'password'}
                    value={digestPassword}
                    onChange={(e) => setDigestPassword(e.target.value)}
                    placeholder="Password"
                    className="w-full bg-[var(--bg-input)] border border-[var(--border-strong)] rounded pl-9 pr-9 py-2 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--border-focus)] transition-colors"
                  />
                  <button
                    onClick={() => setShowDigestPassword(!showDigestPassword)}
                    className="absolute right-3 top-2.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                  >
                    {showDigestPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">Algorithm</label>
                <select
                  value={digestAlgorithm}
                  onChange={(e) => setDigestAlgorithm(e.target.value)}
                  className="w-full bg-[var(--bg-input)] border border-[var(--border-strong)] rounded px-3 py-2 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--border-focus)] transition-colors"
                >
                  <option value="MD5">MD5</option>
                  <option value="MD5-sess">MD5-sess</option>
                  <option value="SHA-256">SHA-256</option>
                  <option value="SHA-256-sess">SHA-256-sess</option>
                  <option value="SHA-512-256">SHA-512-256</option>
                  <option value="SHA-512-256-sess">SHA-512-256-sess</option>
                </select>
              </div>
              <p className="text-[10px] text-[var(--text-secondary)]">Note: Digest authentication flow typically requires an initial 401 response to obtain the challenge details (nonce, realm).</p>
            </div>
          )}

          {/* Hawk Auth */}
          {type === 'hawk' && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">Auth ID</label>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 w-3.5 h-3.5 text-[var(--text-secondary)]" />
                  <input
                    type="text"
                    value={hawkAuthId}
                    onChange={(e) => setHawkAuthId(e.target.value)}
                    placeholder="dh37fgj492je"
                    className="w-full bg-[var(--bg-input)] border border-[var(--border-strong)] rounded pl-9 pr-3 py-2 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--border-focus)] font-mono transition-colors"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">Auth Key</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 w-3.5 h-3.5 text-[var(--text-secondary)]" />
                  <input
                    type={showHawkKey ? 'text' : 'password'}
                    value={hawkAuthKey}
                    onChange={(e) => setHawkAuthKey(e.target.value)}
                    placeholder="werxhqb98rpaxn39848xrunpaw3489ruxnpa98w4rxn"
                    className="w-full bg-[var(--bg-input)] border border-[var(--border-strong)] rounded pl-9 pr-9 py-2 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--border-focus)] font-mono transition-colors"
                  />
                  <button
                    onClick={() => setShowHawkKey(!showHawkKey)}
                    className="absolute right-3 top-2.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                  >
                    {showHawkKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">Algorithm</label>
                  <select
                    value={hawkAlgorithm}
                    onChange={(e) => setHawkAlgorithm(e.target.value as 'sha256' | 'sha1')}
                    className="w-full bg-[var(--bg-input)] border border-[var(--border-strong)] rounded px-3 py-2 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--border-focus)] transition-colors"
                  >
                    <option value="sha256">sha256</option>
                    <option value="sha1">sha1</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">Ext (Optional)</label>
                  <input
                    type="text"
                    value={hawkExt}
                    onChange={(e) => setHawkExt(e.target.value)}
                    placeholder="Ext data..."
                    className="w-full bg-[var(--bg-input)] border border-[var(--border-strong)] rounded px-3 py-2 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--border-focus)] transition-colors"
                  />
                </div>
              </div>
            </div>
          )}
`;
// Insert before </motion.div> which closes the panel inside AnimatePresence or just before the Save button area? Wait, AuthModal returns AnimatePresence -> dialog. 
// I'll just append it after the {type === 'oauth2' ... } block.
content = content.replace(/          \{\/\* Token Actions \*\/\}\n[\s\S]*?<\/div>\n          \)\}/, match => match + '\n' + uiContent);

fs.writeFileSync('src/components/AuthModal.tsx', content);
console.log('done');
