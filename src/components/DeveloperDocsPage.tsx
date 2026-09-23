import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowLeft,
  BookOpen, 
  Search, 
  Code2, 
  Terminal, 
  Server, 
  Cpu, 
  Database, 
  Layers, 
  Copy, 
  Check, 
  ExternalLink, 
  Sparkles, 
  ShieldCheck, 
  Play, 
  Zap, 
  ChevronRight,
  Send,
  FileCode,
  Globe,
  CornerDownRight,
  Sun,
  Moon,
  MonitorSmartphone,
  Keyboard,
  Clock,
  Activity,
  Download,
  AlertCircle
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { api } from '../lib/api';
import { Theme } from '../types';

interface DeveloperDocsPageProps {
  onBack: () => void;
  language?: 'id' | 'en';
  onLanguageChange?: (lang: 'id' | 'en') => void;
}

interface DocSection {
  id: string;
  category: string;
  title: string;
  titleId: string;
  badge?: string;
  badgeColor?: string;
  summary: string;
  summaryId: string;
  content: React.ReactNode;
}

export const DeveloperDocsPage: React.FC<DeveloperDocsPageProps> = ({
  onBack,
  language: initialLanguage = 'id',
  onLanguageChange
}) => {
  const { theme, setTheme, addToast } = useStore();
  const [selectedTopic, setSelectedTopic] = useState<string>('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [testResponse, setTestResponse] = useState<any | null>(null);
  const [testingEndpoint, setTestingEndpoint] = useState(false);
  const [apiHealth, setApiHealth] = useState<'checking' | 'healthy' | 'offline'>('checking');
  
  const [language, setLanguage] = useState<'id' | 'en'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('openpost_lang');
      if (saved === 'id' || saved === 'en') return saved;
    }
    return initialLanguage;
  });

  const handleLangToggle = (lang: 'id' | 'en') => {
    setLanguage(lang);
    localStorage.setItem('openpost_lang', lang);
    if (onLanguageChange) onLanguageChange(lang);
  };

  const cycleTheme = () => {
    const themes: Theme[] = ['default', 'light', 'dark'];
    const nextIndex = (themes.indexOf(theme) + 1) % themes.length;
    setTheme(themes[nextIndex]);
  };

  // Check backend health on mount
  useEffect(() => {
    let isMounted = true;
    api.get('/health')
      .then(res => {
        if (isMounted) {
          if (res.data?.status === 'ok') setApiHealth('healthy');
          else setApiHealth('offline');
        }
      })
      .catch(() => {
        if (isMounted) setApiHealth('offline');
      });
    return () => { isMounted = false; };
  }, []);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    addToast(language === 'id' ? 'Teks berhasil disalin!' : 'Copied to clipboard!', 'success');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleTestHealth = async () => {
    setTestingEndpoint(true);
    setTestResponse(null);
    const startTime = performance.now();
    try {
      const res = await api.get('/health');
      const duration = Math.round(performance.now() - startTime);
      setTestResponse({
        status: res.status,
        statusText: res.statusText || 'OK',
        duration: `${duration}ms`,
        data: res.data
      });
      setApiHealth('healthy');
      addToast(language === 'id' ? 'Uji coba endpoint sukses (200 OK)' : 'Endpoint test succeeded (200 OK)', 'success');
    } catch (err: any) {
      const duration = Math.round(performance.now() - startTime);
      setTestResponse({
        status: err.response?.status || 500,
        statusText: err.response?.statusText || 'Error',
        duration: `${duration}ms`,
        data: err.response?.data || { error: err.message }
      });
      setApiHealth('offline');
      addToast(language === 'id' ? 'Gagal menghubungi endpoint' : 'Failed to reach endpoint', 'error');
    } finally {
      setTestingEndpoint(false);
    }
  };

  const isIndo = language === 'id';

  // Sections definitions
  const sections: DocSection[] = useMemo(() => [
    {
      id: 'overview',
      category: isIndo ? 'Arsitektur & Konsep' : 'Architecture & Core',
      title: 'Platform Architecture & Engine',
      titleId: 'Arsitektur & Desain Sistem',
      badge: 'Core',
      badgeColor: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
      summary: 'High-performance API client architecture combining React 19, Express backend proxy, and SQLite/PostgreSQL embedded storage.',
      summaryId: 'Arsitektur klien API berkinerja tinggi yang menggabungkan React 19, proxy backend Express, dan penyimpanan SQLite/PostgreSQL.',
      content: (
        <div className="space-y-6">
          <p className="text-sm leading-relaxed text-[var(--text-secondary)]">
            {isIndo
              ? 'OpenPost dirancang sebagai platform API modern yang mengedepankan privasi, keandalan offline-first, dan zero-telemetry. Arsitektur ini dibangun dengan pemisahan lapisan yang bersih antara Antarmuka Pengguna (Vite + React 19), Server Backend Proxy (Node.js Express), dan Lapisan Penyimpanan Data (Prisma ORM).'
              : 'OpenPost is engineered as a modern, privacy-first, offline-capable API client with zero telemetry. The architecture maintains a clean separation of concerns between UI (Vite + React 19), Backend Proxy Engine (Node.js Express), and Data Persistence (Prisma ORM).'}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] space-y-2">
              <div className="w-8 h-8 rounded-lg bg-[var(--primary)]/10 text-[var(--primary)] flex items-center justify-center font-bold">
                <Globe className="w-4 h-4" />
              </div>
              <h4 className="text-xs font-bold text-[var(--text-primary)]">Frontend Layer</h4>
              <p className="text-xs text-[var(--text-secondary)]">
                {isIndo ? 'React 19 SPA, Tailwind CSS v4, Monaco Editor, Zustand state, dan motion/react.' : 'React 19 SPA, Tailwind CSS v4, Monaco Editor, Zustand state, and motion/react.'}
              </p>
            </div>

            <div className="p-4 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] space-y-2">
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center font-bold">
                <Cpu className="w-4 h-4" />
              </div>
              <h4 className="text-xs font-bold text-[var(--text-primary)]">Proxy & Execution Engine</h4>
              <p className="text-xs text-[var(--text-secondary)]">
                {isIndo ? 'Express backend proxy mem-bypass batasan CORS browser dan mengeksekusi request HTTP ke target mana pun.' : 'Express backend proxy circumvents browser CORS restrictions and dispatches HTTP requests.'}
              </p>
            </div>

            <div className="p-4 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] space-y-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-bold">
                <Database className="w-4 h-4" />
              </div>
              <h4 className="text-xs font-bold text-[var(--text-primary)]">Persistence Layer</h4>
              <p className="text-xs text-[var(--text-secondary)]">
                {isIndo ? 'SQLite tertanam (dev.db) via Prisma 7 untuk mode desktop mandiri, serta PostgreSQL untuk sinkronisasi cloud.' : 'Embedded SQLite (dev.db) via Prisma 7 for standalone desktop, and PostgreSQL for cloud sync.'}
              </p>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)]">
            <h4 className="text-xs font-bold text-[var(--text-primary)] mb-2 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <span>{isIndo ? 'Prinsip Keamanan & Privasi' : 'Security & Privacy Principles'}</span>
            </h4>
            <ul className="text-xs text-[var(--text-secondary)] space-y-2 list-disc list-inside">
              <li>{isIndo ? 'Zero Telemetry: Kredensial, header autentikasi, dan body payload Anda tidak pernah dikirim ke pihak ketiga.' : 'Zero Telemetry: Your credentials, auth headers, and payloads are never tracked or sent to third parties.'}</li>
              <li>{isIndo ? 'Penyimpanan Kunci Lokal: Variabel lingkungan dan token JWT disimpan terenkripsi di database lokal pengguna.' : 'Local Key Vault: Environment variables and JWT secrets remain encrypted in the local database.'}</li>
              <li>{isIndo ? 'Bypass CORS Aman: Proxy server hanya bertindak atas instruksi klien lokal dan tidak menyimpan riwayat request eksternal.' : 'Secure CORS Bypass: The proxy server only acts upon local client instructions.'}</li>
            </ul>
          </div>
        </div>
      )
    },
    {
      id: 'auth-api',
      category: isIndo ? 'REST API Endpoints' : 'REST API Endpoints',
      title: 'Authentication & Session API',
      titleId: 'API Autentikasi & Sesi',
      badge: 'POST',
      badgeColor: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
      summary: 'Endpoints for registering users, signing in with passwords or Google OAuth, and verifying JWT sessions.',
      summaryId: 'Endpoint untuk pendaftaran pengguna, login password atau Google OAuth, dan verifikasi sesi token JWT.',
      content: (
        <div className="space-y-6">
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
              {isIndo ? 'Daftar Endpoint Autentikasi' : 'Authentication Endpoint Specification'}
            </h4>

            {/* Register */}
            <div className="p-4 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] space-y-3">
              <div className="flex items-center gap-2.5">
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/20 text-blue-500 border border-blue-500/30">POST</span>
                <code className="text-xs font-mono font-semibold text-[var(--text-primary)]">/api/auth/register</code>
              </div>
              <p className="text-xs text-[var(--text-secondary)]">
                {isIndo ? 'Mendaftarkan akun baru dengan email, kata sandi, dan nama lengkap.' : 'Register a new user account with email, password, and full name.'}
              </p>
              <div className="bg-[var(--bg-panel)] p-3 rounded-lg border border-[var(--border-subtle)]">
                <div className="text-[10px] font-bold text-[var(--text-secondary)] uppercase mb-1">Request Body (JSON)</div>
                <pre className="text-xs font-mono text-[var(--text-primary)] overflow-x-auto">
{`{
  "email": "developer@example.com",
  "password": "SecurePassword123!",
  "name": "Jane Developer"
}`}
                </pre>
              </div>
            </div>

            {/* Login */}
            <div className="p-4 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] space-y-3">
              <div className="flex items-center gap-2.5">
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/20 text-blue-500 border border-blue-500/30">POST</span>
                <code className="text-xs font-mono font-semibold text-[var(--text-primary)]">/api/auth/login</code>
              </div>
              <p className="text-xs text-[var(--text-secondary)]">
                {isIndo ? 'Masuk dengan kredensial email & password untuk memperoleh JWT token.' : 'Authenticate with email & password credentials to receive a JWT session token.'}
              </p>
              <div className="bg-[var(--bg-panel)] p-3 rounded-lg border border-[var(--border-subtle)]">
                <div className="text-[10px] font-bold text-[var(--text-secondary)] uppercase mb-1">Response (200 OK)</div>
                <pre className="text-xs font-mono text-[var(--text-primary)] overflow-x-auto">
{`{
  "token": "eyJhbGciOiJIUzI1NiIsIn...",
  "user": {
    "uid": "usr_99182312",
    "email": "developer@example.com",
    "name": "Jane Developer"
  }
}`}
                </pre>
              </div>
            </div>

            {/* Google Auth */}
            <div className="p-4 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] space-y-3">
              <div className="flex items-center gap-2.5">
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/20 text-blue-500 border border-blue-500/30">POST</span>
                <code className="text-xs font-mono font-semibold text-[var(--text-primary)]">/api/auth/google</code>
              </div>
              <p className="text-xs text-[var(--text-secondary)]">
                {isIndo ? 'Autentikasi cepat terintegrasi menggunakan Google ID token atau profil Google.' : 'Fast integrated sign-in using Google OAuth credentials.'}
              </p>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'proxy-api',
      category: isIndo ? 'REST API Endpoints' : 'REST API Endpoints',
      title: 'Proxy & Request Execution Engine',
      titleId: 'Mesin Proxy & Eksekusi HTTP',
      badge: 'CORS Bypass',
      badgeColor: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
      summary: 'High-speed request forwarder that bypasses browser Same-Origin Policy and forwards cookies, headers, and multipart files.',
      summaryId: 'Penerus request kecepatan tinggi yang mem-bypass SOP browser dan meneruskan cookie, header kustom, serta file multipart.',
      content: (
        <div className="space-y-6">
          <p className="text-sm leading-relaxed text-[var(--text-secondary)]">
            {isIndo
              ? 'Endpoint proxy `/api/proxy/execute` berfungsi sebagai jembatan eksekusi backend. Ini memungkinkan Anda menguji API yang tidak mengaktifkan header CORS atau server lokal (localhost, 127.0.0.1, intranet) tanpa hambatan browser security restriction.'
              : 'The `/api/proxy/execute` endpoint acts as the backend execution bridge. It lets you test APIs that do not include permissive CORS headers or internal local network services without browser security blocks.'}
          </p>

          <div className="p-4 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] space-y-3">
            <div className="flex items-center gap-2.5">
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-500 border border-amber-500/30">POST</span>
              <code className="text-xs font-mono font-semibold text-[var(--text-primary)]">/api/proxy/execute</code>
            </div>

            <div className="bg-[var(--bg-panel)] p-3 rounded-lg border border-[var(--border-subtle)]">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-bold text-[var(--text-secondary)] uppercase">cURL Example</span>
                <button
                  type="button"
                  onClick={() => handleCopy(`curl -X POST http://localhost:3000/api/proxy/execute \\
  -H "Content-Type: application/json" \\
  -d '{"url": "https://api.github.com/users/octocat", "method": "GET"}'`, 'curl-proxy')}
                  className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center gap-1 cursor-pointer"
                >
                  {copiedId === 'curl-proxy' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedId === 'curl-proxy' ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
              <pre className="text-xs font-mono text-[var(--text-primary)] overflow-x-auto">
{`curl -X POST http://localhost:3000/api/proxy/execute \\
  -H "Content-Type: application/json" \\
  -d '{
    "url": "https://api.github.com/users/octocat",
    "method": "GET",
    "headers": { "User-Agent": "OpenPost-Client/1.0" }
  }'`}
              </pre>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'scripting-sandbox',
      category: isIndo ? 'Postman Sandbox & Scripting' : 'Postman Sandbox & Scripting',
      title: 'Postman Compatible pm.* API',
      titleId: 'API Skrip Kompatibel pm.*',
      badge: 'pm.* Sandbox',
      badgeColor: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
      summary: 'Complete guide for writing pre-request and test assertion scripts compatible with Postman collections.',
      summaryId: 'Panduan lengkap penulisan skrip pre-request dan pengujian asersi otomatis yang kompatibel dengan koleksi Postman.',
      content: (
        <div className="space-y-6">
          <p className="text-sm leading-relaxed text-[var(--text-secondary)]">
            {isIndo
              ? 'OpenPost mendukung penuh sintaks sandbox `pm.*` yang biasa digunakan di Postman, termasuk pustaka asersi Chai (`pm.expect()`, `pm.test()`), variabel dinamis, serta manipulasi environment runtime.'
              : 'OpenPost includes full support for the Postman `pm.*` sandbox specification, including Chai assertion libraries (`pm.expect()`, `pm.test()`), dynamic random generators, and environment mutations.'}
          </p>

          <div className="p-4 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                <Terminal className="w-4 h-4 text-[var(--primary)]" />
                <span>{isIndo ? 'Contoh Skrip Pengujian Asersi' : 'Example Test Assertion Script'}</span>
              </h4>
              <button
                type="button"
                onClick={() => handleCopy(`// Status code assertion
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

// JSON body structure assertion
pm.test("Response contains authorization token", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData).to.have.property('token');
    pm.expect(jsonData.token).to.be.a('string');
    
    // Automatically save token to environment variable
    pm.environment.set("auth_token", jsonData.token);
});

// Response time validation
pm.test("Response latency is below 350ms", function () {
    pm.expect(pm.response.responseTime).to.be.below(350);
});`, 'pm-test-example')}
                className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center gap-1 cursor-pointer"
              >
                {copiedId === 'pm-test-example' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedId === 'pm-test-example' ? 'Copied' : 'Copy'}</span>
              </button>
            </div>

            <pre className="text-xs font-mono text-[var(--text-primary)] bg-[var(--bg-panel)] p-3.5 rounded-lg border border-[var(--border-subtle)] overflow-x-auto leading-relaxed">
{`// 1. Assert status code
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

// 2. Validate response JSON and extract variable
pm.test("Response contains authorization token", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData).to.have.property('token');
    
    // Save token to active environment for subsequent requests
    pm.environment.set("auth_token", jsonData.token);
});

// 3. Response latency check
pm.test("Response latency is below 350ms", function () {
    pm.expect(pm.response.responseTime).to.be.below(350);
});`}
            </pre>
          </div>

          <div className="p-4 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] space-y-3">
            <h4 className="text-xs font-bold text-[var(--text-primary)]">
              {isIndo ? 'Variabel Dinamis Otomatis' : 'Built-in Dynamic Variables'}
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono">
              <div className="p-2 rounded bg-[var(--bg-panel)] border border-[var(--border-subtle)] flex items-center justify-between">
                <span className="text-[var(--primary)] font-bold">{`{{$guid}}`}</span>
                <span className="text-[var(--text-secondary)] font-sans">UUID v4 generator</span>
              </div>
              <div className="p-2 rounded bg-[var(--bg-panel)] border border-[var(--border-subtle)] flex items-center justify-between">
                <span className="text-[var(--primary)] font-bold">{`{{$timestamp}}`}</span>
                <span className="text-[var(--text-secondary)] font-sans">Current Unix Epoch</span>
              </div>
              <div className="p-2 rounded bg-[var(--bg-panel)] border border-[var(--border-subtle)] flex items-center justify-between">
                <span className="text-[var(--primary)] font-bold">{`{{$randomInt}}`}</span>
                <span className="text-[var(--text-secondary)] font-sans">Random integer (1-1000)</span>
              </div>
              <div className="p-2 rounded bg-[var(--bg-panel)] border border-[var(--border-subtle)] flex items-center justify-between">
                <span className="text-[var(--primary)] font-bold">{`{{$randomEmail}}`}</span>
                <span className="text-[var(--text-secondary)] font-sans">Random test email</span>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'desktop-agent',
      category: isIndo ? 'Aplikasi Desktop & Jembatan Agen' : 'Desktop App & Agent Bridge',
      title: 'Local Agent Bridge (Port 8765)',
      titleId: 'Jembatan Agen Lokal (Port 8765)',
      badge: 'Standalone',
      badgeColor: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
      summary: 'Run requests directly against localhost or intranet servers using the zero-CORS lightweight background agent.',
      summaryId: 'Jalankan request langsung ke localhost atau server intranet tanpa CORS menggunakan agen background ringan.',
      content: (
        <div className="space-y-6">
          <p className="text-sm leading-relaxed text-[var(--text-secondary)]">
            {isIndo
              ? 'OpenPost Desktop Agent berjalan secara lokal pada port 8765. Agen ini bertindak sebagai jembatan jaringan native untuk mengeksekusi request HTTP/HTTPS secara langsung tanpa proxy browser, sehingga Anda dapat menguji layanan microservice lokal di localhost atau jaringan VPN internal kantor secara bebas hambatan.'
              : 'The OpenPost Desktop Agent operates locally on port 8765. It provides a native network bridge that dispatches HTTP/HTTPS requests with zero browser CORS constraints, enabling direct development against local microservices or VPN-restricted internal APIs.'}
          </p>

          <div className="p-4 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] space-y-3">
            <h4 className="text-xs font-bold text-[var(--text-primary)]">
              {isIndo ? 'Menjalankan Desktop Agent secara Mandiri' : 'Starting the Agent Bridge Manually'}
            </h4>
            <div className="bg-[var(--bg-panel)] p-3 rounded-lg border border-[var(--border-subtle)]">
              <pre className="text-xs font-mono text-[var(--text-primary)]">
npm run bridge
# Output: [OpenPost Agent] Local bridge listening on http://127.0.0.1:8765
              </pre>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] space-y-3">
            <h4 className="text-xs font-bold text-[var(--text-primary)]">
              {isIndo ? 'Membangun Aplikasi Desktop Electron (Multi-Platform Otomatis)' : 'Building Standalone Electron Installer (Auto Multi-Platform)'}
            </h4>
            <p className="text-xs text-[var(--text-secondary)]">
              {isIndo ? 'Perintah build:electron secara otomatis membundel installer untuk semua platform sekaligus (Windows .exe, macOS .dmg/.zip, dan Linux .AppImage/.tar.gz):' : 'The build:electron command automatically packages installers for all platforms simultaneously (Windows .exe, macOS .dmg/.zip, and Linux .AppImage/.tar.gz):'}
            </p>
            <div className="bg-[var(--bg-panel)] p-3 rounded-lg border border-[var(--border-subtle)] space-y-2">
              <pre className="text-xs font-mono text-[var(--text-primary)] leading-relaxed">
{`# Auto-build untuk semua platform sekaligus (Windows, macOS, Linux):
npm run build:electron

# Atau pilih platform tertentu:
npm run build:electron:win    # Khusus Windows (.exe NSIS)
npm run build:electron:mac    # Khusus macOS (.dmg / .zip)
npm run build:electron:linux  # Khusus Linux (.AppImage / .tar.gz)`}
              </pre>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'health-diagnostics',
      category: isIndo ? 'Diagnostik & Status' : 'Diagnostics & Status',
      title: 'Diagnostics & System Health API',
      titleId: 'API Diagnostik & Status Sistem',
      badge: 'GET /api/health',
      badgeColor: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
      summary: 'Endpoint diagnostic to verify server health, database connectivity, and runtime uptime.',
      summaryId: 'Endpoint diagnostik untuk memverifikasi kesehatan server, konektivitas database, dan waktu aktif runtime.',
      content: (
        <div className="space-y-6">
          <p className="text-sm leading-relaxed text-[var(--text-secondary)]">
            {isIndo
              ? 'Gunakan konsol interaktif di bawah ini untuk menguji konektivitas server backend secara langsung.'
              : 'Use the interactive console below to perform a live diagnostic check against your backend server.'}
          </p>

          <div className="p-4 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-500 border border-emerald-500/30">GET</span>
                <code className="text-xs font-mono font-semibold text-[var(--text-primary)]">/api/health</code>
              </div>

              <button
                type="button"
                onClick={handleTestHealth}
                disabled={testingEndpoint}
                className="px-3 py-1.5 rounded-lg bg-[var(--primary)] hover:opacity-90 text-white text-xs font-bold transition-all flex items-center gap-1.5 active:scale-95 disabled:opacity-50 cursor-pointer shadow-md shadow-[var(--primary)]/20"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>{testingEndpoint ? (isIndo ? 'Menghubungi...' : 'Testing...') : (isIndo ? 'Kirim Request Uji Coba' : 'Run Test Request')}</span>
              </button>
            </div>

            {testResponse && (
              <div className="bg-[var(--bg-panel)] p-3.5 rounded-lg border border-[var(--border-subtle)] space-y-2">
                <div className="flex items-center justify-between text-[11px] pb-2 border-b border-[var(--border-subtle)]">
                  <span className="font-bold text-emerald-500">Status: {testResponse.status} {testResponse.statusText}</span>
                  <span className="text-[var(--text-secondary)] font-mono">Latency: {testResponse.duration}</span>
                </div>
                <pre className="text-xs font-mono text-[var(--text-primary)] overflow-x-auto">
{JSON.stringify(testResponse.data, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>
      )
    },
    {
      id: 'keyboard-shortcuts',
      category: isIndo ? 'Pintasan Keyboard' : 'Keyboard Shortcuts',
      title: 'Comprehensive Keyboard Shortcuts',
      titleId: 'Daftar Lengkap Pintasan Keyboard',
      badge: 'Productivity',
      badgeColor: 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20',
      summary: 'Speed up your API testing workflow with native keyboard combinations.',
      summaryId: 'Tingkatkan kecepatan workflow pengujian API Anda dengan kombinasi tombol native.',
      content: (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] flex items-center justify-between">
              <span className="text-[var(--text-secondary)]">{isIndo ? 'Kirim Request Aktif' : 'Send Active Request'}</span>
              <kbd className="px-2 py-1 rounded bg-[var(--bg-panel)] border border-[var(--border-subtle)] font-mono font-bold text-[var(--text-primary)]">Ctrl + Enter</kbd>
            </div>
            <div className="p-3 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] flex items-center justify-between">
              <span className="text-[var(--text-secondary)]">{isIndo ? 'Simpan Request' : 'Save Request'}</span>
              <kbd className="px-2 py-1 rounded bg-[var(--bg-panel)] border border-[var(--border-subtle)] font-mono font-bold text-[var(--text-primary)]">Ctrl + S</kbd>
            </div>
            <div className="p-3 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] flex items-center justify-between">
              <span className="text-[var(--text-secondary)]">{isIndo ? 'Pencarian Cepat / Navigasi' : 'Quick Search / Jump'}</span>
              <kbd className="px-2 py-1 rounded bg-[var(--bg-panel)] border border-[var(--border-subtle)] font-mono font-bold text-[var(--text-primary)]">Ctrl + K</kbd>
            </div>
            <div className="p-3 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] flex items-center justify-between">
              <span className="text-[var(--text-secondary)]">{isIndo ? 'Buka Tab Baru' : 'New Request Tab'}</span>
              <kbd className="px-2 py-1 rounded bg-[var(--bg-panel)] border border-[var(--border-subtle)] font-mono font-bold text-[var(--text-primary)]">Ctrl + T</kbd>
            </div>
            <div className="p-3 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] flex items-center justify-between">
              <span className="text-[var(--text-secondary)]">{isIndo ? 'Tutup Tab Aktif' : 'Close Active Tab'}</span>
              <kbd className="px-2 py-1 rounded bg-[var(--bg-panel)] border border-[var(--border-subtle)] font-mono font-bold text-[var(--text-primary)]">Ctrl + W</kbd>
            </div>
            <div className="p-3 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] flex items-center justify-between">
              <span className="text-[var(--text-secondary)]">{isIndo ? 'Ganti Environment Cepat' : 'Switch Environment'}</span>
              <kbd className="px-2 py-1 rounded bg-[var(--bg-panel)] border border-[var(--border-subtle)] font-mono font-bold text-[var(--text-primary)]">Ctrl + E</kbd>
            </div>
          </div>
        </div>
      )
    }
  ], [isIndo, testResponse, testingEndpoint, copiedId]);

  const filteredSections = useMemo(() => {
    if (!searchQuery.trim()) return sections;
    const q = searchQuery.toLowerCase();
    return sections.filter(s => 
      s.title.toLowerCase().includes(q) ||
      s.titleId.toLowerCase().includes(q) ||
      s.summary.toLowerCase().includes(q) ||
      s.summaryId.toLowerCase().includes(q) ||
      s.category.toLowerCase().includes(q)
    );
  }, [sections, searchQuery]);

  const activeSection = sections.find(s => s.id === selectedTopic) || sections[0];

  return (
    <div className={`min-h-screen flex flex-col font-sans transition-colors duration-300 ${
      theme === 'light' ? 'theme-light bg-[var(--bg-base)] text-[var(--text-primary)]' : 
      theme === 'dark' ? 'theme-dark bg-[var(--bg-base)] text-[var(--text-primary)]' : 
      'theme-default bg-[var(--bg-base)] text-[var(--text-primary)]'
    }`}>
      {/* Background Glow */}
      <div className={`fixed inset-0 pointer-events-none -z-10 transition-opacity duration-500 ${
        theme === 'light' 
          ? 'bg-gradient-to-br from-slate-50 via-zinc-100 to-amber-50/20' 
          : theme === 'dark' 
          ? 'bg-gradient-to-br from-[#0F172A] via-[#1E293B] to-[#020617]' 
          : 'bg-gradient-to-br from-[#200017] via-[#3B0A29] to-[#14000E]'
      }`} />

      {/* Top Header Navigation */}
      <header className="sticky top-0 z-40 w-full border-b border-[var(--border-subtle)] bg-[var(--bg-base)]/90 backdrop-blur-md transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          {/* Left: Back Button & Branding */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onBack}
              className="px-3 py-1.5 rounded-lg bg-[var(--bg-surface)] hover:bg-[var(--bg-hover)] text-[var(--text-primary)] border border-[var(--border-subtle)] text-xs font-semibold flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer shadow-xs"
              title={isIndo ? 'Kembali' : 'Go Back'}
            >
              <ArrowLeft className="w-4 h-4 text-[var(--primary)]" />
              <span>{isIndo ? 'Kembali' : 'Back'}</span>
            </button>

            <div className="h-5 w-px bg-[var(--border-subtle)] hidden sm:block" />

            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[var(--primary)] flex items-center justify-center text-white shadow-md shadow-[var(--primary)]/20">
                <BookOpen className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm tracking-tight text-[var(--text-primary)]">OpenPost</span>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[var(--primary)]/15 text-[var(--primary)] uppercase">
                    Developer Docs
                  </span>
                </div>
                <div className="text-[11px] text-[var(--text-secondary)] hidden sm:block">
                  {isIndo ? 'Dokumentasi Teknis & Panduan Integrasi' : 'Technical Documentation & Integration Guide'}
                </div>
              </div>
            </div>
          </div>

          {/* Right: Controls (Search, Health status, Language, Theme) */}
          <div className="flex items-center gap-2.5">
            {/* Live Backend Indicator */}
            <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[11px]">
              <span className={`w-2 h-2 rounded-full ${
                apiHealth === 'healthy' ? 'bg-emerald-500 animate-pulse' : 
                apiHealth === 'checking' ? 'bg-amber-500' : 'bg-rose-500'
              }`} />
              <span className="text-[var(--text-secondary)] font-medium">
                {apiHealth === 'healthy' ? 'API Online' : apiHealth === 'checking' ? 'Connecting...' : 'API Offline'}
              </span>
            </div>

            {/* Language Switcher */}
            <div className="flex items-center bg-[var(--bg-surface)] p-0.5 rounded-lg border border-[var(--border-subtle)] text-xs font-semibold">
              <button
                type="button"
                onClick={() => handleLangToggle('id')}
                className={`px-2 py-1 rounded-md transition-all flex items-center gap-1 cursor-pointer ${
                  language === 'id' 
                    ? 'bg-[var(--primary)] text-white shadow-xs' 
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
                title="Bahasa Indonesia"
              >
                <span>ID</span>
              </button>
              <button
                type="button"
                onClick={() => handleLangToggle('en')}
                className={`px-2 py-1 rounded-md transition-all flex items-center gap-1 cursor-pointer ${
                  language === 'en' 
                    ? 'bg-[var(--primary)] text-white shadow-xs' 
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
                title="English"
              >
                <span>EN</span>
              </button>
            </div>

            {/* Theme Toggle */}
            <button
              type="button"
              onClick={cycleTheme}
              className="p-2 rounded-lg bg-[var(--bg-surface)] hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-subtle)] transition-colors cursor-pointer"
              title={`Theme: ${theme.toUpperCase()}`}
            >
              {theme === 'light' ? (
                <Sun className="w-4 h-4 text-amber-500" />
              ) : theme === 'dark' ? (
                <Moon className="w-4 h-4 text-indigo-400" />
              ) : (
                <MonitorSmartphone className="w-4 h-4 text-[var(--primary)]" />
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Main Documentation Layout */}
      <div className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-6 grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Sidebar Navigation */}
        <aside className="lg:col-span-3 space-y-4">
          {/* Search Bar */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={isIndo ? 'Cari topik atau endpoint...' : 'Search docs or endpoints...'}
              className="w-full pl-9 pr-3 py-2 text-xs bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl text-[var(--text-primary)] placeholder-[var(--text-secondary)]/60 focus:outline-none focus:border-[var(--primary)] transition-all"
            />
          </div>

          {/* Topics List */}
          <div className="space-y-1">
            <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)] px-2 py-1">
              {isIndo ? 'Daftar Topik' : 'Table of Contents'}
            </div>

            {filteredSections.map((sec) => {
              const isSelected = sec.id === selectedTopic;
              return (
                <button
                  key={sec.id}
                  type="button"
                  onClick={() => setSelectedTopic(sec.id)}
                  className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-medium transition-all flex items-center justify-between cursor-pointer border ${
                    isSelected 
                      ? 'bg-[var(--primary)] text-white border-[var(--primary)] shadow-sm' 
                      : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)]'
                  }`}
                >
                  <div className="truncate pr-2">
                    <div className="font-semibold truncate">
                      {isIndo ? sec.titleId : sec.title}
                    </div>
                    <div className={`text-[10px] truncate ${isSelected ? 'text-white/80' : 'text-[var(--text-secondary)]/70'}`}>
                      {sec.category}
                    </div>
                  </div>
                  <ChevronRight className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-white' : 'text-[var(--text-secondary)]/40'}`} />
                </button>
              );
            })}
          </div>

          {/* Quick Help Card */}
          <div className="p-4 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] space-y-2 mt-6">
            <div className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[var(--primary)]" />
              <span>OpenPost Community</span>
            </div>
            <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
              {isIndo 
                ? 'Ingin berkontribusi atau melaporkan bug? Kunjungi repositori GitHub kami.' 
                : 'Want to contribute or report issues? Visit our open GitHub repository.'}
            </p>
            <a
              href="https://github.com/hyvercode"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--primary)] hover:underline"
            >
              <span>GitHub / hyvercode</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </aside>

        {/* Right Main Content Pane */}
        <main className="lg:col-span-9 space-y-6">
          <div className="p-6 sm:p-8 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] shadow-xl space-y-6 transition-colors duration-200">
            {/* Header of Active Section */}
            <div className="border-b border-[var(--border-subtle)] pb-6 space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-[var(--primary)] uppercase tracking-wider">
                  {activeSection.category}
                </span>
                {activeSection.badge && (
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${activeSection.badgeColor || 'bg-[var(--primary)]/10 text-[var(--primary)] border-[var(--primary)]/20'}`}>
                    {activeSection.badge}
                  </span>
                )}
              </div>

              <h2 className="text-2xl font-extrabold tracking-tight text-[var(--text-primary)]">
                {isIndo ? activeSection.titleId : activeSection.title}
              </h2>

              <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed">
                {isIndo ? activeSection.summaryId : activeSection.summary}
              </p>
            </div>

            {/* Content Body */}
            <div>
              {activeSection.content}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};
