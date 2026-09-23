export type Language = 'id' | 'en';

export interface LandingTranslation {
  nav: {
    features: string;
    desktopApp: string;
    architecture: string;
    docs: string;
    github: string;
    downloadDesktop: string;
    getStarted: string;
  };
  hero: {
    kicker: string;
    version: string;
    offlineFirst: string;
    title: string;
    subtitle: string;
  };
  desktopCard: {
    title: string;
    standalone: string;
    desc: string;
    downloadFor: string;
    otherPlatforms: string;
    zeroCors: string;
    completeOffline: string;
    noAccountNeeded: string;
  };
  valueProps: {
    multiProtocol: string;
    multiProtocolDesc: string;
    mockServers: string;
    mockServersDesc: string;
    zeroTelemetry: string;
    zeroTelemetryDesc: string;
  };
  auth: {
    signIn: string;
    createAccount: string;
    resetPassword: string;
    emailAddress: string;
    password: string;
    confirmPassword: string;
    forgotPassword: string;
    signInBtn: string;
    createAccountBtn: string;
    sendResetBtn: string;
    saveNewPasswordBtn: string;
    or: string;
    signInWithGoogle: string;
    signUpWithGoogle: string;
    noAccount: string;
    alreadyHaveAccount: string;
  };
  architecture: {
    title: string;
    subtitle: string;
    clientTitle: string;
    clientDesc: string;
    serverTitle: string;
    serverDesc: string;
    dbTitle: string;
    dbDesc: string;
    bridgeTitle: string;
    bridgeDesc: string;
  };
  features: {
    title: string;
    subtitle: string;
    feat1Title: string;
    feat1Desc: string;
    feat2Title: string;
    feat2Desc: string;
    feat3Title: string;
    feat3Desc: string;
  };
  themeLabels: {
    aubergine: string;
    light: string;
    dark: string;
  };
}

export const LANDING_I18N: Record<Language, LandingTranslation> = {
  id: {
    nav: {
      features: 'Fitur',
      desktopApp: 'Aplikasi Desktop',
      architecture: 'Arsitektur',
      docs: 'Dokumentasi Dev',
      github: 'GitHub',
      downloadDesktop: 'Unduh Desktop',
      getStarted: 'Mulai Sekarang',
    },
    hero: {
      kicker: 'Platform API Open Source',
      version: 'Versi 1.0.0',
      offlineFirst: 'Offline First',
      title: 'Ruang kerja API yang ringan dan offline-first untuk developer.',
      subtitle: 'Desain, uji coba, dan otomatisasi endpoint REST, GraphQL, WebSocket, dan SSE tanpa hambatan cloud. Berjalan mandiri di desktop Anda dengan backend tersemat dan database SQLite, atau berkolaborasi langsung bersama tim.',
    },
    desktopCard: {
      title: 'OpenPost Desktop',
      standalone: 'Mandiri (Standalone)',
      desc: 'Termasuk backend otomatis di background & engine SQLite lokal',
      downloadFor: 'Unduh untuk',
      otherPlatforms: 'Pilihan Platform Lain',
      zeroCors: 'Bebas Hambatan CORS',
      completeOffline: 'Dukungan Penuh Offline',
      noAccountNeeded: 'Tanpa Perlu Akun di Desktop',
    },
    valueProps: {
      multiProtocol: 'Multi-Protokol',
      multiProtocolDesc: 'REST, GraphQL Studio, WebSocket, & SSE streams.',
      mockServers: 'Mock Servers',
      mockServersDesc: 'Buat endpoint tiruan instan dengan delay dan respons kustom.',
      zeroTelemetry: 'Bebas Telemetri',
      zeroTelemetryDesc: 'Kunci API dan payload rahasia Anda tetap berada di lokal.',
    },
    auth: {
      signIn: 'Masuk',
      createAccount: 'Daftar Akun',
      resetPassword: 'Reset Kata Sandi',
      emailAddress: 'Alamat Email',
      password: 'Kata Sandi',
      confirmPassword: 'Konfirmasi Kata Sandi',
      forgotPassword: 'Lupa kata sandi?',
      signInBtn: 'Masuk ke Workspace',
      createAccountBtn: 'Daftar Akun Gratis',
      sendResetBtn: 'Kirim Tautan Reset',
      saveNewPasswordBtn: 'Simpan Kata Sandi Baru',
      or: 'atau',
      signInWithGoogle: 'Masuk dengan Google',
      signUpWithGoogle: 'Daftar dengan Google',
      noAccount: 'Belum punya akun?',
      alreadyHaveAccount: 'Sudah punya akun?',
    },
    architecture: {
      title: 'Arsitektur OpenPost',
      subtitle: 'Dirancang fleksibel: dapat berjalan sebagai aplikasi desktop mandiri maupun aplikasi web tim full-stack.',
      clientTitle: 'Frontend Client (React 19 + Vite)',
      clientDesc: 'Antarmuka cepat dengan Tailwind CSS, editor kode monaco/codemirror, dan manajemen state terpadu.',
      serverTitle: 'Embedded Express Server',
      serverDesc: 'Melayani request proxy untuk mem-bypass CORS, mengeksekusi script pre-request (pm.*), dan mock server.',
      dbTitle: 'Database Fleksibel (SQLite & Postgres)',
      dbDesc: 'Menggunakan SQLite lokal untuk desktop offline atau PostgreSQL terpusat dengan Prisma ORM.',
      bridgeTitle: 'Local Desktop Agent Bridge',
      bridgeDesc: 'Agen desktop lokal di port 8765 yang menghubungkan browser web dengan network lokal Anda.',
    },
    features: {
      title: 'Dirancang untuk Kecepatan & Privasi Developer',
      subtitle: 'Semua kemampuan penting dari API client modern tanpa cloud lock-in atau pelacakan privasi.',
      feat1Title: 'Full-Stack API Client & Scripting',
      feat1Desc: 'Uji REST, GraphQL dengan introspeksi skema interaktif, WebSocket, dan SSE. Kompatibel dengan skrip pengujian Postman (pm.*) dan variabel dinamis.',
      feat2Title: 'Mock Servers & Runner Pengujian',
      feat2Desc: 'Simulasikan respons backend secara instan dengan kode status, header, dan payload kustom. Jalankan otomatisasi pengujian regresi dengan data CSV/JSON.',
      feat3Title: 'Aplikasi Desktop & Agen Lokal',
      feat3Desc: 'Unduh aplikasi desktop mandiri yang ditenagai backend dan SQLite internal. Termasuk jembatan agen lokal untuk mengeliminasi CORS secara total.',
    },
    themeLabels: {
      aubergine: 'Aubergine',
      light: 'Mode Terang',
      dark: 'Mode Gelap',
    },
  },
  en: {
    nav: {
      features: 'Features',
      desktopApp: 'Desktop App',
      architecture: 'Architecture',
      docs: 'Developer Docs',
      github: 'GitHub',
      downloadDesktop: 'Download Desktop',
      getStarted: 'Get Started',
    },
    hero: {
      kicker: 'Open Source API Client',
      version: 'Version 1.0.0',
      offlineFirst: 'Offline First',
      title: 'The lightweight, offline-first API workspace for engineers.',
      subtitle: 'Design, debug, and automate REST, GraphQL, WebSocket, and SSE endpoints with zero cloud friction. Run standalone on your desktop with an embedded offline backend and SQLite database, or collaborate with your team in real time.',
    },
    desktopCard: {
      title: 'OpenPost Desktop',
      standalone: 'Standalone',
      desc: 'Includes embedded background server & local SQLite engine',
      downloadFor: 'Download for',
      otherPlatforms: 'Other Platforms',
      zeroCors: 'Zero CORS Blockers',
      completeOffline: 'Complete Offline Mode',
      noAccountNeeded: 'No Account Required for Desktop',
    },
    valueProps: {
      multiProtocol: 'Multi-Protocol',
      multiProtocolDesc: 'REST, GraphQL Studio, WebSocket, & SSE streams.',
      mockServers: 'Mock Servers',
      mockServersDesc: 'Spin up instant mock endpoints with custom JSON & delays.',
      zeroTelemetry: 'Zero Telemetry',
      zeroTelemetryDesc: 'Your API secrets and payload stay strictly local.',
    },
    auth: {
      signIn: 'Sign In',
      createAccount: 'Create Account',
      resetPassword: 'Reset Password',
      emailAddress: 'Email Address',
      password: 'Password',
      confirmPassword: 'Confirm Password',
      forgotPassword: 'Forgot password?',
      signInBtn: 'Sign In to Workspace',
      createAccountBtn: 'Create Free Account',
      sendResetBtn: 'Send Reset Link',
      saveNewPasswordBtn: 'Save New Password',
      or: 'or',
      signInWithGoogle: 'Sign in with Google',
      signUpWithGoogle: 'Sign up with Google',
      noAccount: "Don't have an account?",
      alreadyHaveAccount: 'Already have an account?',
    },
    architecture: {
      title: 'OpenPost Architecture',
      subtitle: 'Designed for flexibility: runs as an offline standalone desktop app or as a full-stack collaborative platform.',
      clientTitle: 'Frontend Client (React 19 + Vite)',
      clientDesc: 'High-performance UI built with Tailwind CSS, reactive state management, and rich Monaco editors.',
      serverTitle: 'Embedded Express Server',
      serverDesc: 'Powers proxying without CORS restrictions, runs pre-request sandboxed scripts (pm.*), and hosts mock routes.',
      dbTitle: 'Dual Storage (SQLite & Postgres)',
      dbDesc: 'Local zero-config SQLite for single-user desktop offline mode, or PostgreSQL with Prisma ORM for team sync.',
      bridgeTitle: 'Local Desktop Agent Bridge',
      bridgeDesc: 'Lightweight daemon running on port 8765 to bridge web sessions to local machine endpoints.',
    },
    features: {
      title: 'Engineered for developer velocity & privacy',
      subtitle: 'All the essentials of a modern API client without bloated cloud lock-in or tracking.',
      feat1Title: 'Full-Stack API Client & Scripting',
      feat1Desc: 'Test REST, GraphQL with interactive schema introspection, WebSocket, and SSE. Full support for Postman-compatible test scripts (pm.*) and dynamic environment variables.',
      feat2Title: 'Mock Servers & Batch Runner',
      feat2Desc: 'Simulate backend endpoints instantly with custom status codes, headers, and payloads. Run automated regression test suites using data-driven CSV or JSON test matrices.',
      feat3Title: 'Native Desktop & Local Agent',
      feat3Desc: 'Download the standalone desktop application powered by an embedded offline server and SQLite engine. Includes local proxy bridge to eliminate CORS barriers completely.',
    },
    themeLabels: {
      aubergine: 'Aubergine',
      light: 'Light Mode',
      dark: 'Dark Mode',
    },
  },
};
