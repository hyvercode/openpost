import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
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
  CornerDownRight
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { api } from '../lib/api';

interface DeveloperDocsModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  initialTopic?: string;
  language?: 'id' | 'en';
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

export const DeveloperDocsModal: React.FC<DeveloperDocsModalProps> = ({
  isOpen: propsIsOpen,
  onClose: propsOnClose,
  initialTopic = 'overview',
  language = 'id'
}) => {
  const { theme, addToast, isDocsModalOpen, setIsDocsModalOpen } = useStore();
  const isOpen = propsIsOpen !== undefined ? propsIsOpen : isDocsModalOpen;
  const onClose = () => {
    if (propsOnClose) {
      propsOnClose();
    } else {
      setIsDocsModalOpen(false);
    }
  };
  const [selectedTopic, setSelectedTopic] = useState<string>(initialTopic);
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [testResponse, setTestResponse] = useState<any | null>(null);
  const [testingEndpoint, setTestingEndpoint] = useState(false);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    addToast(language === 'id' ? 'Kode disalin ke clipboard!' : 'Code copied to clipboard!', 'success', 2000);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleTestHealth = async () => {
    setTestingEndpoint(true);
    setTestResponse(null);
    try {
      const res = await api.get('/health');
      setTestResponse({ status: res.status, data: res.data });
      addToast('Endpoint tested: 200 OK', 'success', 2500);
    } catch (err: any) {
      setTestResponse({ status: err.response?.status || 500, error: err.message });
      addToast('Endpoint test failed', 'error', 2500);
    } finally {
      setTestingEndpoint(false);
    }
  };

  const sections: DocSection[] = useMemo(() => [
    {
      id: 'overview',
      category: language === 'id' ? 'Pengenalan' : 'Getting Started',
      title: 'OpenPost Platform Overview',
      titleId: 'Ikhtisar Platform OpenPost',
      badge: 'v1.0.0',
      badgeColor: 'text-[var(--primary)] bg-[var(--primary)]/10',
      summary: 'High-performance, offline-first API workspace with zero cloud lock-in.',
      summaryId: 'Platform pengujian API offline-first berkecepatan tinggi tanpa keterikatan cloud.',
      content: (
        <div className="space-y-6">
          <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
            {language === 'id' 
              ? 'OpenPost adalah platform API modern yang dirancang untuk pengembang perangkat lunak, QA engineer, dan tim teknis. Dibangun sebagai aplikasi monolitik yang dapat berjalan baik sebagai web app full-stack maupun aplikasi desktop mandiri (Electron) dengan backend terintegrasi.'
              : 'OpenPost is a modern API platform designed for software engineers, QA teams, and architects. It is architected as a full-stack monolith that runs seamlessly both as a browser workspace and as an offline desktop application.'}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] space-y-2">
              <div className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-2">
                <Zap className="w-4 h-4 text-[var(--primary)]" />
                <span>{language === 'id' ? 'Protokol Lengkap' : 'Full Protocol Support'}</span>
              </div>
              <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
                {language === 'id'
                  ? 'REST, GraphQL dengan introspeksi skema langsung, WebSocket bidirectional real-time, dan Server-Sent Events (SSE).'
                  : 'REST, GraphQL with live introspection and syntax highlighting, bidirectional WebSockets, and Server-Sent Events (SSE).'}
              </p>
            </div>

            <div className="p-4 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] space-y-2">
              <div className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                <span>{language === 'id' ? 'Bebas Hambatan CORS' : 'Zero CORS Restrictions'}</span>
              </div>
              <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
                {language === 'id'
                  ? 'Backend Express bertindak sebagai proxy cerdas lokal sehingga semua request dapat dijalankan tanpa halangan CORS browser.'
                  : 'Embedded backend acts as a smart local proxy server so requests execute without browser cross-origin policy restrictions.'}
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">
              {language === 'id' ? 'Struktur Arsitektur' : 'Architecture Blueprint'}
            </h4>
            <div className="p-3.5 rounded-xl bg-[var(--bg-input)] border border-[var(--border-subtle)] font-mono text-[11px] text-[var(--text-primary)] space-y-1">
              <div>UI Client: React 19 + Tailwind CSS + Monaco Editor</div>
              <div className="text-[var(--primary)]">↳ Backend Proxy: Express.js (Port 3000)</div>
              <div className="text-emerald-500">  ↳ ORM Layer: Prisma 7 Driver Adapters</div>
              <div className="text-amber-500">    ↳ Storage: SQLite (dev.db) / PostgreSQL (Neon / RDS)</div>
              <div className="text-sky-400">      ↳ Desktop Agent Bridge: Native Node Daemon (Port 8765)</div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'rest-api',
      category: 'API Reference',
      title: 'Core Backend REST Endpoints',
      titleId: 'Referensi Endpoint REST API',
      badge: 'HTTP / JSON',
      badgeColor: 'text-blue-500 bg-blue-500/10',
      summary: 'Public and authenticated REST endpoints exposed by the OpenPost Express server.',
      summaryId: 'Daftar endpoint publik dan berotentikasi yang disediakan server Express OpenPost.',
      content: (
        <div className="space-y-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">
                Health &amp; Diagnostic
              </h4>
              <button
                type="button"
                onClick={handleTestHealth}
                disabled={testingEndpoint}
                className="px-2.5 py-1 rounded bg-[var(--primary)] text-white text-[11px] font-semibold flex items-center gap-1.5 hover:opacity-90 transition-opacity cursor-pointer"
              >
                <Play className="w-3 h-3" />
                <span>{testingEndpoint ? 'Testing...' : 'Test GET /api/health'}</span>
              </button>
            </div>

            <div className="p-3.5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] space-y-2">
              <div className="flex items-center gap-2 text-xs font-mono">
                <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-500 font-bold">GET</span>
                <span className="text-[var(--text-primary)] font-semibold">/api/health</span>
              </div>
              <p className="text-[11px] text-[var(--text-secondary)]">
                {language === 'id' ? 'Memverifikasi status server dan kesiapan backend.' : 'Returns 200 OK status indicating backend readiness.'}
              </p>
              {testResponse && (
                <div className="p-2.5 rounded bg-[var(--bg-input)] border border-[var(--border-subtle)] font-mono text-[10px] text-emerald-400">
                  Status: {testResponse.status} · Body: {JSON.stringify(testResponse.data || testResponse.error)}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">
              Authentication Endpoints
            </h4>

            <div className="space-y-2.5">
              <div className="p-3.5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] space-y-2">
                <div className="flex items-center gap-2 text-xs font-mono">
                  <span className="px-2 py-0.5 rounded bg-amber-500/15 text-amber-500 font-bold">POST</span>
                  <span className="text-[var(--text-primary)] font-semibold">/api/auth/register</span>
                </div>
                <p className="text-[11px] text-[var(--text-secondary)]">
                  {language === 'id' ? 'Mendaftarkan akun user baru dengan email & kata sandi.' : 'Registers a new user and provisions default workspace.'}
                </p>
                <div className="p-2 rounded bg-[var(--bg-input)] text-[10px] font-mono text-[var(--text-secondary)]">
                  Payload: &#123; "email": "user@example.com", "password": "secure_password" &#125;
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] space-y-2">
                <div className="flex items-center gap-2 text-xs font-mono">
                  <span className="px-2 py-0.5 rounded bg-amber-500/15 text-amber-500 font-bold">POST</span>
                  <span className="text-[var(--text-primary)] font-semibold">/api/auth/login</span>
                </div>
                <p className="text-[11px] text-[var(--text-secondary)]">
                  {language === 'id' ? 'Autentikasi user dan mengembalikan JSON Web Token (JWT).' : 'Authenticates credentials and returns signed JWT token.'}
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] space-y-2">
                <div className="flex items-center gap-2 text-xs font-mono">
                  <span className="px-2 py-0.5 rounded bg-amber-500/15 text-amber-500 font-bold">POST</span>
                  <span className="text-[var(--text-primary)] font-semibold">/api/auth/google</span>
                </div>
                <p className="text-[11px] text-[var(--text-secondary)]">
                  {language === 'id' ? 'Autentikasi dan registrasi instan dengan Google OAuth / profile token.' : 'Authenticates or auto-registers accounts using Google Identity payload.'}
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">
              CORS-Free Proxy Execution
            </h4>
            <div className="p-3.5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] space-y-2">
              <div className="flex items-center gap-2 text-xs font-mono">
                <span className="px-2 py-0.5 rounded bg-purple-500/15 text-purple-400 font-bold">POST</span>
                <span className="text-[var(--text-primary)] font-semibold">/api/proxy/execute</span>
              </div>
              <p className="text-[11px] text-[var(--text-secondary)]">
                {language === 'id' 
                  ? 'Menjalankan request API eksternal atas nama client, mengeksekusi skrip sandbox, dan mengembalikan header, payload, metrik waktu respon, dan ukuran bytes.'
                  : 'Executes external API requests on behalf of the client, runs sandboxed pre/post scripts, and returns response metrics, headers, and body.'}
              </p>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'scripting',
      category: language === 'id' ? 'Otomasi' : 'Automation',
      title: 'Scripting Sandbox (pm.* API)',
      titleId: 'Sandbox Skrip Pengujian (pm.* API)',
      badge: 'Postman Compatible',
      badgeColor: 'text-amber-500 bg-amber-500/10',
      summary: 'Postman-compatible JavaScript test sandbox for assertions and environment manipulation.',
      summaryId: 'Lingkungan eksekusi pengujian JavaScript kompatibel Postman untuk manipulasi environment dan asersi.',
      content: (
        <div className="space-y-6">
          <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
            {language === 'id'
              ? 'OpenPost mendukung penuh skrip Pre-request dan Tests menggunakan objek global pm.* yang kompatibel dengan Postman.'
              : 'OpenPost includes full sandbox execution for Pre-request and Post-response Test scripts using the industry standard pm.* syntax.'}
          </p>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[var(--text-primary)]">
                {language === 'id' ? 'Contoh Skrip Asersi Respons' : 'Test Assertions Example'}
              </span>
              <button
                type="button"
                onClick={() => handleCopy(`// Verify HTTP Status
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

// Parse and validate JSON structure
pm.test("Response contains user token", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData.token).to.be.a('string');
    pm.expect(jsonData.user.email).to.include('@');
    
    // Save token to environment for subsequent requests
    pm.environment.set("auth_token", jsonData.token);
});

// Measure response latency
pm.test("Response time is less than 500ms", function () {
    pm.expect(pm.response.responseTime).to.be.below(500);
});`, 'test-script')}
                className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center gap-1 cursor-pointer"
              >
                {copiedId === 'test-script' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedId === 'test-script' ? 'Copied' : 'Copy'}</span>
              </button>
            </div>

            <pre className="p-3.5 rounded-xl bg-[var(--bg-input)] border border-[var(--border-subtle)] font-mono text-[11px] text-amber-400 overflow-x-auto">
{`// Verify HTTP Status
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

// Parse and validate JSON structure
pm.test("Response contains user token", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData.token).to.be.a('string');
    pm.expect(jsonData.user.email).to.include('@');
    
    // Save token to environment for subsequent requests
    pm.environment.set("auth_token", jsonData.token);
});

// Measure response latency
pm.test("Response time is less than 500ms", function () {
    pm.expect(pm.response.responseTime).to.be.below(500);
});`}
            </pre>
          </div>

          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">
              {language === 'id' ? 'Daftar Variabel Dinamis' : 'Dynamic Variable Replacers'}
            </h4>
            <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
              <div className="p-2 rounded bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[var(--text-primary)]">
                <span className="text-[var(--primary)] font-bold">&#123;&#123;$guid&#125;&#125;</span>
                <span className="text-[var(--text-secondary)] ml-2">UUID v4 string</span>
              </div>
              <div className="p-2 rounded bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[var(--text-primary)]">
                <span className="text-[var(--primary)] font-bold">&#123;&#123;$timestamp&#125;&#125;</span>
                <span className="text-[var(--text-secondary)] ml-2">Unix epoch (sec)</span>
              </div>
              <div className="p-2 rounded bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[var(--text-primary)]">
                <span className="text-[var(--primary)] font-bold">&#123;&#123;$isoTimestamp&#125;&#125;</span>
                <span className="text-[var(--text-secondary)] ml-2">ISO 8601 string</span>
              </div>
              <div className="p-2 rounded bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[var(--text-primary)]">
                <span className="text-[var(--primary)] font-bold">&#123;&#123;$randomInt&#125;&#125;</span>
                <span className="text-[var(--text-secondary)] ml-2">Random 0 - 1000</span>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'desktop-agent',
      category: 'Desktop & Agent',
      title: 'Desktop Agent & Native Packaging',
      titleId: 'Aplikasi Desktop & Jembatan Agen Lokal',
      badge: 'Port 8765',
      badgeColor: 'text-emerald-500 bg-emerald-500/10',
      summary: 'Connecting browser sessions to localhost services and building standalone desktop executables.',
      summaryId: 'Menghubungkan browser dengan endpoint localhost lokal dan memaketkan aplikasi desktop mandiri.',
      content: (
        <div className="space-y-6">
          <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
            {language === 'id'
              ? 'Ketika menjalankan OpenPost via browser web, kebijakan keamanan browser biasanya memblokir panggilan ke 127.0.0.1 atau localhost. Desktop Agent dan versi Desktop Native mengatasi batasan ini secara total.'
              : 'When accessing OpenPost via web browsers, browser sandbox security policies restrict direct HTTP requests to 127.0.0.1 or internal private subnets. The Desktop Agent and Native Desktop builds solve this.'}
          </p>

          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">
              {language === 'id' ? 'Menjalankan Agen Jembatan Lokal' : 'Running the Local Desktop Bridge'}
            </h4>
            <div className="p-3.5 rounded-xl bg-[var(--bg-input)] border border-[var(--border-subtle)] space-y-2">
              <div className="flex items-center justify-between font-mono text-xs text-[var(--text-primary)]">
                <code>npm run bridge</code>
                <button
                  type="button"
                  onClick={() => handleCopy('npm run bridge', 'bridge-cmd')}
                  className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
                >
                  {copiedId === 'bridge-cmd' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
              <p className="text-[11px] text-[var(--text-secondary)]">
                {language === 'id'
                  ? 'Menjalankan daemon ringan di http://127.0.0.1:8765 dengan header CORS terbuka dan enkripsi transport lokal.'
                  : 'Starts a lightweight daemon at http://127.0.0.1:8765 with permissive local origin headers.'}
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">
              {language === 'id' ? 'Membangun Installer Desktop (Electron)' : 'Compiling Native Desktop Binaries'}
            </h4>
            <div className="p-3.5 rounded-xl bg-[var(--bg-input)] border border-[var(--border-subtle)] space-y-2">
              <div className="flex items-center justify-between font-mono text-xs text-[var(--text-primary)]">
                <code>npm run build:electron</code>
                <button
                  type="button"
                  onClick={() => handleCopy('npm run build:electron', 'build-cmd')}
                  className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
                >
                  {copiedId === 'build-cmd' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
              <p className="text-[11px] text-[var(--text-secondary)]">
                {language === 'id'
                  ? 'Membuat paket installer (.exe untuk Windows, .dmg untuk macOS, .AppImage untuk Linux) di folder release/ lengkap dengan backend dan SQLite.'
                  : 'Generates packaged installers (.exe for Windows, .dmg for macOS, .AppImage for Linux) in the release/ directory.'}
              </p>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'code-gen',
      category: 'SDK & Snippets',
      title: 'Code Generation & Client Snippets',
      titleId: 'Generator Cuplikan Kode & SDK',
      badge: '5+ Languages',
      badgeColor: 'text-purple-500 bg-purple-500/10',
      summary: 'Export any OpenPost request directly into idiomatic code snippets for production systems.',
      summaryId: 'Ekspor setiap request OpenPost langsung ke cuplikan kode produksi dalam berbagai bahasa pemrograman.',
      content: (
        <div className="space-y-6">
          <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
            {language === 'id'
              ? 'Setiap request yang Anda konfigurasi di OpenPost dapat langsung diekspor menjadi kode siap pakai dalam berbagai bahasa:'
              : 'Every request configured in OpenPost can be generated into drop-in production code across multiple languages:'}
          </p>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[var(--text-primary)]">JavaScript (Fetch API)</span>
              <button
                type="button"
                onClick={() => handleCopy(`const response = await fetch("https://api.example.com/v1/users", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Authorization": "Bearer YOUR_ACCESS_TOKEN"
  },
  body: JSON.stringify({
    name: "Alex Morgan",
    role: "Engineering Lead"
  })
});

const data = await response.json();
console.log(data);`, 'js-fetch')}
                className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center gap-1 cursor-pointer"
              >
                {copiedId === 'js-fetch' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedId === 'js-fetch' ? 'Copied' : 'Copy'}</span>
              </button>
            </div>

            <pre className="p-3.5 rounded-xl bg-[var(--bg-input)] border border-[var(--border-subtle)] font-mono text-[11px] text-cyan-400 overflow-x-auto">
{`const response = await fetch("https://api.example.com/v1/users", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Authorization": "Bearer YOUR_ACCESS_TOKEN"
  },
  body: JSON.stringify({
    name: "Alex Morgan",
    role: "Engineering Lead"
  })
});

const data = await response.json();
console.log(data);`}
            </pre>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[var(--text-primary)]">Python (Requests)</span>
              <button
                type="button"
                onClick={() => handleCopy(`import requests

url = "https://api.example.com/v1/users"
headers = {
    "Content-Type": "application/json",
    "Authorization": "Bearer YOUR_ACCESS_TOKEN"
}
payload = {
    "name": "Alex Morgan",
    "role": "Engineering Lead"
}

response = requests.post(url, json=payload, headers=headers)
print(response.status_code)
print(response.json())`, 'py-req')}
                className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center gap-1 cursor-pointer"
              >
                {copiedId === 'py-req' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedId === 'py-req' ? 'Copied' : 'Copy'}</span>
              </button>
            </div>

            <pre className="p-3.5 rounded-xl bg-[var(--bg-input)] border border-[var(--border-subtle)] font-mono text-[11px] text-emerald-400 overflow-x-auto">
{`import requests

url = "https://api.example.com/v1/users"
headers = {
    "Content-Type": "application/json",
    "Authorization": "Bearer YOUR_ACCESS_TOKEN"
}
payload = {
    "name": "Alex Morgan",
    "role": "Engineering Lead"
}

response = requests.post(url, json=payload, headers=headers)
print(response.status_code)
print(response.json())`}
            </pre>
          </div>
        </div>
      )
    }
  ], [language, testResponse, testingEndpoint, copiedId]);

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

  if (!isOpen) return null;

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200 ${
      theme === 'light' ? 'theme-light' : theme === 'dark' ? 'theme-dark' : 'theme-default'
    }`}>
      <motion.div 
        initial={{ scale: 0.96, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.96, opacity: 0 }}
        className="w-full max-w-5xl h-[88vh] bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded-2xl shadow-2xl overflow-hidden flex flex-col text-[var(--text-primary)]"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-[var(--border-subtle)] bg-[var(--bg-surface)] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[var(--primary)] flex items-center justify-center text-white shadow-md shadow-[var(--primary)]/20">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold tracking-tight text-[var(--text-primary)]">
                  {language === 'id' ? 'Dokumentasi Developer OpenPost' : 'OpenPost Developer Documentation'}
                </h2>
                <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-[var(--primary)]/15 text-[var(--primary)] border border-[var(--primary)]/30">
                  Docs v1.0
                </span>
              </div>
              <p className="text-xs text-[var(--text-secondary)]">
                {language === 'id' ? 'Panduan teknis, referensi API, skrip sandbox, dan arsitektur sistem' : 'Technical reference, REST endpoints, sandbox scripting, and architecture'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button 
              onClick={onClose}
              className="p-2 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-panel)] transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body: Sidebar + Main Documentation Stage */}
        <div className="flex-1 flex overflow-hidden">
          {/* Sidebar Navigation */}
          <aside className="w-64 sm:w-72 border-r border-[var(--border-subtle)] bg-[var(--bg-surface)] flex flex-col p-4 gap-3 shrink-0">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={language === 'id' ? 'Cari dokumentasi...' : 'Search documentation...'}
                className="w-full bg-[var(--bg-input)] border border-[var(--border-subtle)] rounded-xl py-2 pl-9 pr-3 text-xs text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]/40 focus:outline-none focus:border-[var(--primary)] transition-all"
              />
            </div>

            {/* Topic List */}
            <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
              {filteredSections.map(s => {
                const isActive = activeSection.id === s.id;
                return (
                  <button
                    key={s.id}
                    onClick={() => setSelectedTopic(s.id)}
                    className={`w-full p-2.5 rounded-xl text-left transition-all flex flex-col gap-0.5 cursor-pointer ${
                      isActive 
                        ? 'bg-[var(--primary)] text-white shadow-md' 
                        : 'hover:bg-[var(--bg-panel)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`text-[10px] uppercase font-bold tracking-wider ${isActive ? 'text-white/80' : 'text-[var(--text-secondary)]'}`}>
                        {s.category}
                      </span>
                      {s.badge && (
                        <span className={`text-[9px] px-1.5 py-0.2 rounded font-medium ${isActive ? 'bg-white/20 text-white' : s.badgeColor}`}>
                          {s.badge}
                        </span>
                      )}
                    </div>
                    <span className={`text-xs font-semibold truncate ${isActive ? 'text-white' : 'text-[var(--text-primary)]'}`}>
                      {language === 'id' ? s.titleId : s.title}
                    </span>
                  </button>
                );
              })}
            </div>
          </aside>

          {/* Active Article Viewer */}
          <main className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6 bg-[var(--bg-base)]">
            <div className="border-b border-[var(--border-subtle)] pb-4 space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase font-bold tracking-wider text-[var(--primary)]">
                  {activeSection.category}
                </span>
                <span className="text-[var(--text-secondary)]">·</span>
                <span className="text-xs text-[var(--text-secondary)]">
                  {language === 'id' ? 'Diperbarui untuk OpenPost v1.0.0' : 'Updated for OpenPost v1.0.0'}
                </span>
              </div>

              <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">
                {language === 'id' ? activeSection.titleId : activeSection.title}
              </h1>

              <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed">
                {language === 'id' ? activeSection.summaryId : activeSection.summary}
              </p>
            </div>

            {/* Dynamic Section Content */}
            <div className="text-[var(--text-primary)]">
              {activeSection.content}
            </div>
          </main>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-[var(--border-subtle)] bg-[var(--bg-surface)] flex items-center justify-between text-xs text-[var(--text-secondary)]">
          <div className="flex items-center gap-2">
            <FileCode className="w-4 h-4 text-[var(--primary)]" />
            <span>OpenPost OpenAPI 3.1 &amp; Postman Collection v2.1 Compatible</span>
          </div>

          <div className="flex items-center gap-4">
            <a 
              href="https://github.com/hyvercode" 
              target="_blank" 
              rel="noreferrer" 
              className="hover:text-[var(--text-primary)] transition-colors flex items-center gap-1"
            >
              <span>GitHub Repo</span>
              <ExternalLink className="w-3 h-3" />
            </a>
            <button
              onClick={onClose}
              className="px-3 py-1 rounded-lg bg-[var(--bg-panel)] hover:bg-[var(--bg-hover)] text-[var(--text-primary)] text-xs font-semibold transition-colors cursor-pointer"
            >
              {language === 'id' ? 'Tutup' : 'Close'}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
