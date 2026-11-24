import { useEffect, useMemo, useRef, useState } from 'react'
import { Bot, MessageSquareText, RotateCcw, Send, Sparkles, User } from 'lucide-react'
import { addMonths } from 'date-fns'
import { useAuth } from '@/context/AuthContext'
import { useData } from '@/context/DataContext'
import { Badge, Button, Card, CardHeader, FullLoader, PageHeader, Select, clsx } from '@/components/ui'
import { QUESTIONS, answer, matchQuestion, periodFromText } from '@/lib/chatbot'
import { formatMonth, monthKey, toDate } from '@/lib/format'

const TONE_BAR = { good: 'bg-[#0ca30c]', bad: 'bg-[#d03b3b]', neutral: 'bg-slate-400 dark:bg-slate-500' }
const TONE_TEXT = { good: 'text-[#0a8a0a] dark:text-[#4ccb4c]', bad: 'text-[#c13030] dark:text-[#f07b7b]', neutral: 'muted' }

const WELCOME = {
  role: 'bot',
  id: 'welcome',
  body: {
    lines: [
      'Halo! Saya asisten data sementara. Jawaban saya dihitung otomatis dari data Anda dengan rumus tetap, belum memakai AI.',
      'Pilih salah satu pertanyaan di bawah, atau ketik pertanyaan yang mirip.',
    ],
  },
}

function monthOptions(n = 12) {
  return Array.from({ length: n }, (_, i) => {
    const d = addMonths(new Date(), -i)
    return { value: monthKey(d), label: i === 0 ? `${formatMonth(d)} (bulan ini)` : formatMonth(d) }
  })
}

/** Teks pertanyaan menyesuaikan periode: "bulan ini" -> nama bulan bila bukan bulan berjalan. */
const questionText = (q, period) =>
  period === monthKey() ? q.text : q.text.replace('bulan ini', formatMonth(toDate(period + '-01')))

function BotAnswer({ body }) {
  return (
    <div className="space-y-3 text-sm leading-relaxed">
      {body.verdict && (
        <Badge tone={body.verdict.tone} className="!whitespace-normal !text-[12px]">
          {body.verdict.text}
        </Badge>
      )}
      {body.lines.map((l, i) => (
        <p key={i}>{l}</p>
      ))}
      {body.stats && (
        <div className="grid gap-2 sm:grid-cols-3">
          {body.stats.map((s) => (
            <div key={s.label} className="rounded-xl bg-white px-3 py-2 dark:bg-white/5">
              <p className="faint text-[11px]">{s.label}</p>
              <p className="truncate text-sm font-bold tabular-nums">{s.value}</p>
            </div>
          ))}
        </div>
      )}
      {body.rows && (
        <div className="rounded-xl bg-white p-3 dark:bg-white/5">
          {body.rowsTitle && <p className="faint mb-2 text-[11px] font-semibold uppercase tracking-wide">{body.rowsTitle}</p>}
          <ul className="space-y-2.5">
            {body.rows.map((r) => (
              <li key={r.label}>
                <div className="flex items-baseline justify-between gap-3 text-[13px]">
                  <span className="min-w-0">{r.label}</span>
                  <span className="shrink-0 tabular-nums">
                    <span className="font-semibold">{r.value}</span>
                    {r.sub && <span className={clsx('ml-2 text-xs', TONE_TEXT[r.tone] || 'muted')}>{r.sub}</span>}
                  </span>
                </div>
                <div className="mt-1 h-1.5 rounded-full bg-slate-100 dark:bg-white/10">
                  <div className={clsx('h-1.5 rounded-full', TONE_BAR[r.tone] || TONE_BAR.neutral)} style={{ width: `${Math.max(r.pct || 0, r.pct ? 2 : 0)}%` }} />
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
      {body.quote && (
        <blockquote className="rounded-xl border-l-4 border-slate-300 bg-white px-3 py-2 dark:border-white/20 dark:bg-white/5">
          <p className="italic">“{body.quote.text}”</p>
          <p className="faint mt-1 text-xs">{body.quote.by}</p>
        </blockquote>
      )}
      {body.note && <p className="faint text-xs">{body.note}</p>}
    </div>
  )
}

function Message({ m }) {
  const bot = m.role === 'bot'
  return (
    <div className={clsx('flex gap-2.5', !bot && 'flex-row-reverse')}>
      <div
        className={clsx(
          'mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full',
          bot ? 'bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300' : 'bg-slate-200 text-slate-600 dark:bg-white/10 dark:text-slate-300',
        )}
      >
        {bot ? <Bot className="h-4 w-4" /> : <User className="h-4 w-4" />}
      </div>
      <div
        className={clsx(
          'max-w-[88%] rounded-2xl px-3.5 py-2.5',
          bot ? 'rounded-tl-sm bg-slate-50 dark:bg-white/5' : 'rounded-tr-sm bg-brand-600 text-sm text-white',
        )}
      >
        {bot ? m.typing ? <Typing /> : <BotAnswer body={m.body} /> : m.text}
      </div>
    </div>
  )
}

const Typing = () => (
  <span className="flex gap-1 py-1.5" aria-label="Menghitung">
    {[0, 1, 2].map((i) => (
      <span key={i} className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400" style={{ animationDelay: `${i * 120}ms` }} />
    ))}
  </span>
)

export default function DataAnalyst() {
  const { loading, orders, testimonials } = useData()
  const { settings, labels: L } = useAuth()
  const [period, setPeriod] = useState(monthKey())
  const [messages, setMessages] = useState([WELCOME])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const scroller = useRef(null)
  const months = useMemo(() => monthOptions(), [])

  useEffect(() => {
    const el = scroller.current
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
  }, [messages])

  const ask = (text, id, p = period) => {
    if (busy) return
    const key = Date.now()
    setBusy(true)
    setMessages((ms) => [...ms, { role: 'user', id: `u${key}`, text }, { role: 'bot', id: `b${key}`, typing: true }])
    setTimeout(() => {
      const body = id
        ? answer(id, { orders, testimonials, period: p, settings, L })
        : {
            lines: [
              'Maaf, pertanyaan itu belum bisa saya jawab. Saat ini saya hanya memahami empat topik: kinerja/ketepatan deadline, perspektif pelanggan (ulasan), revenue, dan kenaikan penghasilan per minggu.',
              'Pertanyaan bebas akan didukung setelah modul AI aktif.',
            ],
          }
      setMessages((ms) => ms.map((m) => (m.id === `b${key}` ? { ...m, typing: false, body } : m)))
      setBusy(false)
    }, 450)
  }

  const submit = (e) => {
    e.preventDefault()
    const text = input.trim()
    if (!text) return
    setInput('')
    ask(text, matchQuestion(text), periodFromText(text, period))
  }

  if (loading) return <FullLoader />
  return (
    <>
      <PageHeader
        title="Data Analyst"
        subtitle="Asisten AI yang membaca data usaha Anda dan menjawab pertanyaan analitis."
        action={<Badge tone="violet" icon={Sparkles}>AI segera hadir</Badge>}
      />
      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="flex flex-col lg:col-span-3">
          <CardHeader
            title="Chatbot data (sementara)"
            subtitle="Jawaban otomatis dari pertanyaan yang tersedia, dihitung dengan rumus tetap. Ini belum AI."
            action={
              <button
                type="button"
                onClick={() => setMessages([WELCOME])}
                className="muted inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs hover:bg-slate-100 dark:hover:bg-white/10"
                title="Mulai ulang percakapan"
              >
                <RotateCcw className="h-3.5 w-3.5" /> Ulang
              </button>
            }
          />
          <div className="flex items-center gap-2 px-5 pt-3">
            <span className="faint shrink-0 text-xs">Periode</span>
            <Select className="!h-8 !py-0 text-xs" value={period} onChange={(e) => setPeriod(e.target.value)} options={months} />
          </div>
          <div ref={scroller} className="mt-3 h-[460px] space-y-4 overflow-y-auto border-y border-slate-100 px-4 py-4 dark:border-white/10 sm:px-5" aria-live="polite">
            {messages.map((m) => (
              <Message key={m.id} m={m} />
            ))}
          </div>
          <div className="space-y-3 px-4 py-4 sm:px-5">
            <div className="flex flex-wrap gap-2">
              {QUESTIONS.map((q) => (
                <button
                  key={q.id}
                  type="button"
                  disabled={busy}
                  onClick={() => ask(questionText(q, period), q.id)}
                  className="rounded-full border border-brand-200 bg-brand-50 px-3 py-1.5 text-left text-xs font-medium text-brand-700 transition hover:bg-brand-100 disabled:opacity-50 dark:border-brand-500/30 dark:bg-brand-500/10 dark:text-brand-200 dark:hover:bg-brand-500/20"
                >
                  {questionText(q, period)}
                </button>
              ))}
            </div>
            <form onSubmit={submit} className="flex gap-2">
              <input
                className="input flex-1"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Atau ketik, mis. “revenue bulan lalu berapa?”"
                maxLength={200}
              />
              <Button type="submit" disabled={busy || !input.trim()} className="shrink-0" aria-label="Kirim">
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </div>
        </Card>

        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader title="Rencana modul AI" subtitle="Status: segera hadir" action={<Bot className="h-4 w-4 text-ink-3" />} />
            <ul className="muted list-inside list-disc space-y-1.5 px-5 pb-4 pt-3 text-sm">
              <li>Tanya-jawab bebas: “Region mana yang paling menguntungkan 3 bulan terakhir?”</li>
              <li>Ringkasan performa mingguan/bulanan otomatis</li>
              <li>Prediksi beban kerja & pendapatan bulan depan</li>
              <li>Rekomendasi harga per level dan segmentasi pelanggan</li>
            </ul>
            <p className="faint px-5 pb-5 text-xs">
              Modul AI akan dibangun pada tahap berikutnya (butuh API key model AI di sisi server). Sampai saat itu, chatbot di samping
              menggantikannya sementara.
            </p>
          </Card>
          <Card>
            <CardHeader title="Cara chatbot menghitung" action={<MessageSquareText className="h-4 w-4 text-ink-3" />} />
            <dl className="space-y-2.5 px-5 pb-5 pt-3 text-sm">
              <div>
                <dt className="font-semibold">Kinerja</dt>
                <dd className="muted">Persentase order selesai paling lambat H-1 sebelum deadline, dari semua order yang selesai di bulan itu.</dd>
              </div>
              <div>
                <dt className="font-semibold">Perspektif pelanggan</dt>
                <dd className="muted">Rata-rata rating dan sentimen dari menu Ulasan.</dd>
              </div>
              <div>
                <dt className="font-semibold">Revenue</dt>
                <dd className="muted">Total harga order yang selesai di bulan itu (omzet kotor, belum dikurangi biaya).</dd>
              </div>
              <div>
                <dt className="font-semibold">Kenaikan</dt>
                <dd className="muted">Penghasilan per blok 7 hari dalam bulan, dibandingkan antar minggu dan dengan periode yang sama bulan lalu.</dd>
              </div>
            </dl>
          </Card>
        </div>
      </div>
    </>
  )
}
