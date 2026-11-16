export default function SetupMissing() {
  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="card max-w-lg p-6">
        <h1 className="text-xl font-extrabold">Konfigurasi Supabase belum diisi</h1>
        <p className="muted mt-2 text-sm leading-relaxed">
          Aplikasi membutuhkan environment variable <code className="font-mono">VITE_SUPABASE_URL</code> dan{' '}
          <code className="font-mono">VITE_SUPABASE_ANON_KEY</code>. Isi di Vercel → Project → Settings → Environment Variables,
          lalu <b>Redeploy</b>. Untuk development lokal, salin <code className="font-mono">.env.example</code> menjadi{' '}
          <code className="font-mono">.env.local</code>. Panduan lengkap ada di <code className="font-mono">DEPLOY.md</code>.
        </p>
      </div>
    </div>
  )
}
