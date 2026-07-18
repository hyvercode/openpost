import { useState, useEffect, useRef } from 'react';
import { RequestAuth } from '../types';
import { useStore } from '../store/useStore';
import { Key, Lock, User, Eye, EyeOff, Copy, Check, ExternalLink, Shield, Info, X, Loader2 } from 'lucide-react';
import axios from 'axios';

interface AuthModalProps {
  isOpen: boolean;
  auth: RequestAuth | undefined;
  onSave: (auth: RequestAuth) => void;
  onClose: () => void;
}

export function AuthModal({ isOpen, auth, onSave, onClose }: AuthModalProps) {
  const { addToast } = useStore();
  const [type, setType] = useState<RequestAuth['type']>('none');

  // Bearer
  const [bearerToken, setBearerToken] = useState('');

  // Basic
  const [basicUsername, setBasicUsername] = useState('');
  const [basicPassword, setBasicPassword] = useState('');
  const [showBasicPassword, setShowBasicPassword] = useState(false);

  // API Key
  const [apiKeyName, setApiKeyName] = useState('X-API-Key');
  const [apiKeyValue, setApiKeyValue] = useState('');
  const [apiKeyAddTo, setApiKeyAddTo] = useState<'header' | 'query'>('header');

  // OAuth 2.0
  const [oauthGrantType, setOauthGrantType] = useState<'authorization_code' | 'client_credentials'>('authorization_code');
  const [oauthAuthUrl, setOauthAuthUrl] = useState('');
  const [oauthAccessTokenUrl, setOauthAccessTokenUrl] = useState('');
  const [oauthClientId, setOauthClientId] = useState('');
  const [oauthClientSecret, setOauthClientSecret] = useState('');
  const [oauthScope, setOauthScope] = useState('');
  const [oauthAccessToken, setOauthAccessToken] = useState('');
  const [showOauthSecret, setShowOauthSecret] = useState(false);

  const [copiedCallback, setCopiedCallback] = useState(false);
  const [isTokenLoading, setIsTokenLoading] = useState(false);

  // Load initial settings
  useEffect(() => {
    if (isOpen) {
      const currentType = auth?.type || 'none';
      setType(currentType);

      setBearerToken(auth?.bearer?.token || '');

      setBasicUsername(auth?.basic?.username || '');
      setBasicPassword(auth?.basic?.password || '');
      setShowBasicPassword(false);

      setApiKeyName(auth?.apikey?.key || 'X-API-Key');
      setApiKeyValue(auth?.apikey?.value || '');
      setApiKeyAddTo(auth?.apikey?.addTo || 'header');

      setOauthGrantType(auth?.oauth2?.grantType || 'authorization_code');
      setOauthAuthUrl(auth?.oauth2?.authUrl || '');
      setOauthAccessTokenUrl(auth?.oauth2?.accessTokenUrl || '');
      setOauthClientId(auth?.oauth2?.clientId || '');
      setOauthClientSecret(auth?.oauth2?.clientSecret || '');
      setOauthScope(auth?.oauth2?.scope || '');
      setOauthAccessToken(auth?.oauth2?.accessToken || '');
      setShowOauthSecret(false);
    }
  }, [isOpen, auth]);

  const callbackUrl = `${window.location.origin}/auth/callback`;

  // Listen for message from popup in Authorization Code flow
  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      
      if (event.data?.type === 'OAUTH_AUTH_SUCCESS' && event.data?.code) {
        const { code } = event.data;
        addToast('Authorization code obtained. Exchanging for access token...', 'info', 2000);
        await exchangeCodeForToken(code);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [oauthAccessTokenUrl, oauthClientId, oauthClientSecret]);

  const handleCopyCallback = () => {
    navigator.clipboard.writeText(callbackUrl);
    setCopiedCallback(true);
    addToast('Callback URL copied to clipboard', 'success', 2000);
    setTimeout(() => setCopiedCallback(false), 2000);
  };

  // Perform exchange of authorization code for Access Token
  const exchangeCodeForToken = async (code: string) => {
    if (!oauthAccessTokenUrl) {
      addToast('Access Token URL is required to exchange the code', 'error');
      return;
    }
    
    setIsTokenLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('grant_type', 'authorization_code');
      params.append('code', code);
      params.append('redirect_uri', callbackUrl);
      params.append('client_id', oauthClientId);
      params.append('client_secret', oauthClientSecret);

      const res = await axios.post('/api/proxy', {
        method: 'POST',
        url: oauthAccessTokenUrl,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString()
      });

      if (res.data && res.data.access_token) {
        setOauthAccessToken(res.data.access_token);
        addToast('OAuth 2.0 Access Token successfully acquired!', 'success', 3000);
      } else {
        const errDetails = res.data ? JSON.stringify(res.data) : 'No access_token found in response';
        addToast(`Failed to exchange token: ${errDetails}`, 'error');
      }
    } catch (err: any) {
      console.error('Code exchange failed', err);
      addToast(`Token Exchange Error: ${err.message}`, 'error');
    } finally {
      setIsTokenLoading(false);
    }
  };

  // Fetch access token via Client Credentials flow
  const handleGetClientCredentialsToken = async () => {
    if (!oauthAccessTokenUrl) {
      addToast('Access Token URL is required', 'error');
      return;
    }

    setIsTokenLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('grant_type', 'client_credentials');
      if (oauthScope) {
        params.append('scope', oauthScope);
      }

      const headers: Record<string, string> = {
        'Content-Type': 'application/x-www-form-urlencoded',
      };

      if (oauthClientId && oauthClientSecret) {
        headers['Authorization'] = `Basic ${btoa(`${oauthClientId}:${oauthClientSecret}`)}`;
      }

      const res = await axios.post('/api/proxy', {
        method: 'POST',
        url: oauthAccessTokenUrl,
        headers,
        body: params.toString()
      });

      if (res.data && res.data.access_token) {
        setOauthAccessToken(res.data.access_token);
        addToast('OAuth 2.0 Access Token successfully acquired!', 'success', 3000);
      } else {
        const errorMsg = res.data?.error_description || res.data?.error || 'No access_token in response';
        addToast(`Failed to get token: ${errorMsg}`, 'error');
      }
    } catch (err: any) {
      console.error('Client credentials token fetch failed', err);
      addToast(`Token Fetch Error: ${err.message}`, 'error');
    } finally {
      setIsTokenLoading(false);
    }
  };

  const handleStartOAuthFlow = () => {
    if (!oauthAuthUrl) {
      addToast('Authorization URL is required', 'error');
      return;
    }

    if (!oauthClientId) {
      addToast('Client ID is required', 'error');
      return;
    }

    try {
      const authUrlObj = new URL(oauthAuthUrl);
      authUrlObj.searchParams.set('client_id', oauthClientId);
      authUrlObj.searchParams.set('redirect_uri', callbackUrl);
      authUrlObj.searchParams.set('response_type', 'code');
      if (oauthScope) {
        authUrlObj.searchParams.set('scope', oauthScope);
      }

      const popup = window.open(
        authUrlObj.toString(),
        'oauth2_popup',
        'width=600,height=700,status=no,resizable=yes,scrollbars=yes'
      );

      if (!popup) {
        addToast('Popup blocker detected. Please allow popups for this site.', 'warning');
      }
    } catch (e) {
      addToast('Invalid Authorization URL format', 'error');
    }
  };

  const handleSave = () => {
    const config: RequestAuth = {
      type,
      bearer: type === 'bearer' ? { token: bearerToken } : undefined,
      basic: type === 'basic' ? { username: basicUsername, password: basicPassword } : undefined,
      apikey: type === 'apikey' ? { key: apiKeyName, value: apiKeyValue, addTo: apiKeyAddTo } : undefined,
      oauth2: type === 'oauth2' ? {
        grantType: oauthGrantType,
        authUrl: oauthAuthUrl,
        accessTokenUrl: oauthAccessTokenUrl,
        clientId: oauthClientId,
        clientSecret: oauthClientSecret,
        scope: oauthScope,
        accessToken: oauthAccessToken
      } : undefined
    };

    onSave(config);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded-lg w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border-subtle)]">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-green-500" />
            <h3 className="text-[var(--text-primary)] text-sm font-semibold">Configure Authentication</h3>
          </div>
          <button 
            onClick={onClose} 
            className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors p-1 rounded hover:bg-[var(--bg-hover)]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          
          {/* Select Auth Type */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">Auth Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as RequestAuth['type'])}
              className="w-full bg-[var(--bg-input)] border border-[var(--border-strong)] rounded px-3 py-2 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--border-focus)] transition-colors"
            >
              <option value="none">No Auth</option>
              <option value="bearer">Bearer Token</option>
              <option value="basic">Basic Auth</option>
              <option value="apikey">API Key</option>
              <option value="oauth2">OAuth 2.0 (Token Flow)</option>
            </select>
          </div>

          {/* Type Specific Fields */}
          {type === 'none' && (
            <div className="flex flex-col items-center justify-center py-6 text-center text-[var(--text-secondary)]">
              <Info className="w-8 h-8 opacity-40 mb-2 text-[var(--text-secondary)]" />
              <p className="text-xs">No active authorization for this request.</p>
              <p className="text-[10px] opacity-70">Headers and params will not be altered by Auth.</p>
            </div>
          )}

          {/* Bearer Token */}
          {type === 'bearer' && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">Token</label>
                <div className="relative">
                  <Key className="absolute left-3 top-2.5 w-3.5 h-3.5 text-[var(--text-secondary)]" />
                  <input
                    type="text"
                    value={bearerToken}
                    onChange={(e) => setBearerToken(e.target.value)}
                    placeholder="eyJhbGciOi..."
                    className="w-full bg-[var(--bg-input)] border border-[var(--border-strong)] rounded pl-9 pr-3 py-2 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--border-focus)] font-mono transition-colors"
                  />
                </div>
                <span className="text-[10px] text-[var(--text-secondary)] block">
                  Automatically injected into the request header as <code className="font-mono text-green-500">Authorization: Bearer &lt;token&gt;</code>
                </span>
              </div>
            </div>
          )}

          {/* Basic Auth */}
          {type === 'basic' && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">Username</label>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 w-3.5 h-3.5 text-[var(--text-secondary)]" />
                  <input
                    type="text"
                    value={basicUsername}
                    onChange={(e) => setBasicUsername(e.target.value)}
                    placeholder="username"
                    className="w-full bg-[var(--bg-input)] border border-[var(--border-strong)] rounded pl-9 pr-3 py-2 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--border-focus)] transition-colors"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 w-3.5 h-3.5 text-[var(--text-secondary)]" />
                  <input
                    type={showBasicPassword ? 'text' : 'password'}
                    value={basicPassword}
                    onChange={(e) => setBasicPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-[var(--bg-input)] border border-[var(--border-strong)] rounded pl-9 pr-10 py-2 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--border-focus)] transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowBasicPassword(!showBasicPassword)}
                    className="absolute right-3 top-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors p-0.5 rounded"
                  >
                    {showBasicPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <span className="text-[10px] text-[var(--text-secondary)] block">
                  Automatically Base64 encoded and injected as <code className="font-mono text-green-500">Authorization: Basic &lt;credentials&gt;</code>
                </span>
              </div>
            </div>
          )}

          {/* API Key */}
          {type === 'apikey' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">Key Name</label>
                  <input
                    type="text"
                    value={apiKeyName}
                    onChange={(e) => setApiKeyName(e.target.value)}
                    placeholder="X-API-Key"
                    className="w-full bg-[var(--bg-input)] border border-[var(--border-strong)] rounded px-3 py-2 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--border-focus)] font-mono transition-colors"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">Add To</label>
                  <select
                    value={apiKeyAddTo}
                    onChange={(e) => setApiKeyAddTo(e.target.value as 'header' | 'query')}
                    className="w-full bg-[var(--bg-input)] border border-[var(--border-strong)] rounded px-3 py-2 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--border-focus)] transition-colors"
                  >
                    <option value="header">Header</option>
                    <option value="query">Query Parameter</option>
                  </select>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">Key Value</label>
                <div className="relative">
                  <Key className="absolute left-3 top-2.5 w-3.5 h-3.5 text-[var(--text-secondary)]" />
                  <input
                    type="text"
                    value={apiKeyValue}
                    onChange={(e) => setApiKeyValue(e.target.value)}
                    placeholder="api-key-secret-xyz"
                    className="w-full bg-[var(--bg-input)] border border-[var(--border-strong)] rounded pl-9 pr-3 py-2 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--border-focus)] font-mono transition-colors"
                  />
                </div>
                <span className="text-[10px] text-[var(--text-secondary)] block">
                  Injected as a {apiKeyAddTo === 'header' ? 'request header' : 'query parameter'} during transmission.
                </span>
              </div>
            </div>
          )}

          {/* OAuth 2.0 */}
          {type === 'oauth2' && (
            <div className="space-y-4">
              
              {/* Grant Type */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">Grant Type</label>
                <select
                  value={oauthGrantType}
                  onChange={(e) => setOauthGrantType(e.target.value as any)}
                  className="w-full bg-[var(--bg-input)] border border-[var(--border-strong)] rounded px-3 py-2 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--border-focus)] transition-colors"
                >
                  <option value="authorization_code">Authorization Code</option>
                  <option value="client_credentials">Client Credentials</option>
                </select>
              </div>

              {/* Callback URL - only for Auth Code */}
              {oauthGrantType === 'authorization_code' && (
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider flex items-center justify-between">
                    <span>Callback URL</span>
                    <span className="text-[10px] text-green-500 font-normal">Ready & Secure</span>
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      readOnly
                      value={callbackUrl}
                      className="flex-1 bg-[var(--bg-hover)] border border-[var(--border-strong)] rounded px-3 py-2 text-xs text-[var(--text-secondary)] font-mono outline-none cursor-not-allowed"
                    />
                    <button
                      type="button"
                      onClick={handleCopyCallback}
                      className="px-3 bg-[var(--bg-hover)] border border-[var(--border-strong)] hover:border-[var(--border-focus)] text-[var(--text-primary)] rounded transition-colors flex items-center justify-center p-2"
                      title="Copy Callback URL"
                    >
                      {copiedCallback ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              )}

              {/* Auth URL - only for Auth Code */}
              {oauthGrantType === 'authorization_code' && (
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">Authorization URL</label>
                  <input
                    type="text"
                    value={oauthAuthUrl}
                    onChange={(e) => setOauthAuthUrl(e.target.value)}
                    placeholder="https://example.com/oauth/authorize"
                    className="w-full bg-[var(--bg-input)] border border-[var(--border-strong)] rounded px-3 py-2 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--border-focus)] font-mono transition-colors"
                  />
                </div>
              )}

              {/* Access Token URL */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">Access Token URL</label>
                <input
                  type="text"
                  value={oauthAccessTokenUrl}
                  onChange={(e) => setOauthAccessTokenUrl(e.target.value)}
                  placeholder="https://example.com/oauth/token"
                  className="w-full bg-[var(--bg-input)] border border-[var(--border-strong)] rounded px-3 py-2 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--border-focus)] font-mono transition-colors"
                />
              </div>

              {/* Client ID and Secret */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">Client ID</label>
                  <input
                    type="text"
                    value={oauthClientId}
                    onChange={(e) => setOauthClientId(e.target.value)}
                    placeholder="client_id_123"
                    className="w-full bg-[var(--bg-input)] border border-[var(--border-strong)] rounded px-3 py-2 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--border-focus)] font-mono transition-colors"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">Client Secret</label>
                  <div className="relative">
                    <input
                      type={showOauthSecret ? 'text' : 'password'}
                      value={oauthClientSecret}
                      onChange={(e) => setOauthClientSecret(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-[var(--bg-input)] border border-[var(--border-strong)] rounded pl-3 pr-8 py-2 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--border-focus)] font-mono transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowOauthSecret(!showOauthSecret)}
                      className="absolute right-2.5 top-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors p-0.5 rounded"
                    >
                      {showOauthSecret ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Scope */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">Scope</label>
                <input
                  type="text"
                  value={oauthScope}
                  onChange={(e) => setOauthScope(e.target.value)}
                  placeholder="read write offline_access"
                  className="w-full bg-[var(--bg-input)] border border-[var(--border-strong)] rounded px-3 py-2 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--border-focus)] font-mono transition-colors"
                />
              </div>

              {/* Actions for obtaining tokens */}
              <div className="pt-2">
                {oauthGrantType === 'authorization_code' ? (
                  <button
                    type="button"
                    onClick={handleStartOAuthFlow}
                    className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-sm"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Launch Authorization Window
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={isTokenLoading}
                    onClick={handleGetClientCredentialsToken}
                    className="w-full py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-800 text-white rounded text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-sm"
                  >
                    {isTokenLoading ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Shield className="w-3.5 h-3.5" />
                    )}
                    Acquire Access Token (Client Credentials)
                  </button>
                )}
              </div>

              {/* Access Token Display */}
              <div className="space-y-1.5 pt-2 border-t border-[var(--border-subtle)]">
                <label className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">Current Access Token</label>
                <input
                  type="text"
                  value={oauthAccessToken}
                  onChange={(e) => setOauthAccessToken(e.target.value)}
                  placeholder="No active token. Run flow above or enter token manually."
                  className="w-full bg-[var(--bg-input)] border border-[var(--border-strong)] rounded px-3 py-2 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--border-focus)] font-mono transition-colors"
                />
                <span className="text-[10px] text-[var(--text-secondary)] block">
                  Automatically injected as <code className="font-mono text-green-500">Authorization: Bearer &lt;token&gt;</code> in headers.
                </span>
              </div>

            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-[var(--border-subtle)] bg-[var(--bg-hover)] flex justify-end gap-3 rounded-b-lg">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] font-semibold transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-5 py-2 text-xs bg-green-600 hover:bg-green-700 text-white font-semibold rounded shadow-sm transition-colors"
          >
            Save Authentication
          </button>
        </div>

      </div>
    </div>
  );
}
