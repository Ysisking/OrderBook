// =====================================================================
// Konstanta domain. Label yang bisa diubah per jenis usaha ada di
// BUSINESS_PRESETS dan disimpan per pengguna di user_settings.labels.
// =====================================================================

export const ORDER_STATUSES = [
  { value: 'antrian', label: 'Dalam Antrian', tone: 'slate' },
  { value: 'on_progress', label: 'On Progress', tone: 'blue' },
  { value: 'menunggu_pelunasan', label: 'Menunggu Pelunasan', tone: 'amber' },
  { value: 'selesai', label: 'Sudah Selesai', tone: 'green' },
]
export const ACTIVE_STATUSES = ['antrian', 'on_progress', 'menunggu_pelunasan']

export const PAYMENT_STATUSES = [
  { value: 'dp', label: 'DP' },
  { value: 'full', label: 'Full (Lunas)' },
  { value: 'lainnya', label: 'Lainnya' },
]

export const TASK_STATUSES = [
  { value: 'sudah', label: 'Sudah', tone: 'green' },
  { value: 'on_progress', label: 'On Progress', tone: 'blue' },
  { value: 'return', label: 'Return', tone: 'red' },
]

export const LOYALTY_SCORES = Array.from({ length: 10 }, (_, i) => ({ value: String(i + 1), label: String(i + 1) }))

export const BEHAVIORS = [
  { value: 'tanpa_menawar', label: 'Membeli tanpa menawar', positive: true },
  { value: 'dengan_menawar', label: 'Membeli dengan menawar', positive: false },
  { value: 'agak_cerewet', label: 'Agak cerewet', positive: false },
  { value: 'sering_bonus', label: 'Sering ngasih bonus', positive: true },
  { value: 'paham_tugas', label: 'Paham tugas dengan baik', positive: true },
  { value: 'tidak_paham', label: 'Tidak paham tugas sama sekali', positive: false },
]

export const COMPLAINTS = [
  { value: 'performa_rendah', label: 'Performa saya dinilai rendah padahal sesuai request' },
  { value: 'order_tidak_sesuai', label: 'Order dinilai tidak sesuai padahal sesuai' },
  { value: 'banyak_minta', label: 'Banyak mintanya' },
  { value: 'bawel', label: 'Bawel' },
]

export const SENTIMENTS = [
  { value: 'positif', label: 'Positif', tone: 'green' },
  { value: 'netral', label: 'Netral', tone: 'slate' },
  { value: 'negatif', label: 'Negatif', tone: 'red' },
]

export const sentimentFromRating = (r) => (r >= 4 ? 'positif' : r <= 2 ? 'negatif' : 'netral')

// Label default (jasa tugas) — tiap kunci bisa ditimpa lewat Pengaturan > Set Up
export const DEFAULT_LABELS = {
  app_name: 'OrderBook',
  menu_po: 'Purchase Order',
  order: 'Order',
  customer: 'Pelanggan',
  customer_name: 'Nama Pelanggan',
  phone: 'Nomor HP',
  task_name: 'Nama Tugas',
  deadline: 'Tanggal Deadline',
  level: 'Level Tugas',
  region: 'Region',
  price: 'Harga',
}

export const LABEL_FIELDS = [
  { key: 'menu_po', hint: 'Nama menu pencatatan pesanan' },
  { key: 'order', hint: 'Sebutan untuk satu pesanan' },
  { key: 'customer', hint: 'Sebutan untuk pembeli' },
  { key: 'customer_name', hint: 'Kolom nama pembeli' },
  { key: 'phone', hint: 'Kolom kontak' },
  { key: 'task_name', hint: 'Kolom nama pekerjaan/produk' },
  { key: 'deadline', hint: 'Kolom tenggat' },
  { key: 'level', hint: 'Kolom tingkatan pesanan' },
  { key: 'region', hint: 'Kolom wilayah/lokasi' },
  { key: 'price', hint: 'Kolom nilai pesanan' },
]

const lv = (...labels) => labels.map((label, i) => ({ value: `l${i + 1}`, label }))

export const BUSINESS_PRESETS = [
  {
    id: 'jasa_tugas',
    name: 'Jasa Pengerjaan Tugas',
    labels: {},
    levels: lv('Basic', 'Medium', 'High', 'Over High'),
  },
  {
    id: 'desain',
    name: 'Desain & Kreatif',
    labels: { task_name: 'Nama Proyek', level: 'Kompleksitas', customer: 'Klien', customer_name: 'Nama Klien' },
    levels: lv('Basic', 'Standard', 'Premium', 'Enterprise'),
  },
  {
    id: 'percetakan',
    name: 'Percetakan / Konveksi',
    labels: { task_name: 'Produk Cetak', level: 'Tingkat Kerumitan', region: 'Kota' },
    levels: lv('Standar', 'Custom', 'Premium', 'Express'),
  },
  {
    id: 'kuliner',
    name: 'Kuliner / Katering',
    labels: { task_name: 'Menu Pesanan', level: 'Skala Pesanan', region: 'Area Antar', deadline: 'Tanggal Kirim' },
    levels: lv('Kecil', 'Sedang', 'Besar', 'Event'),
  },
  {
    id: 'servis',
    name: 'Servis / Reparasi',
    labels: { task_name: 'Jenis Servis', level: 'Tingkat Kerusakan', region: 'Lokasi', deadline: 'Target Selesai' },
    levels: lv('Ringan', 'Sedang', 'Berat', 'Total'),
  },
  {
    id: 'custom',
    name: 'Lainnya (atur sendiri)',
    labels: {},
    levels: lv('Level 1', 'Level 2', 'Level 3', 'Level 4'),
  },
]

export const DEFAULT_SETTINGS = {
  theme: 'system',
  business_type: 'jasa_tugas',
  labels: {},
  task_levels: BUSINESS_PRESETS[0].levels,
  deadline_warning_days: 3,
  restore_window_days: 30,
  allow_restore_after_window: false,
  monthly_target: 0,
}

// Palet kategori tervalidasi (CVD-safe, urutan tetap) + warna status
export const SERIES = {
  light: ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#6250d6', '#e34948'],
  dark: ['#3987e5', '#d95926', '#199e70', '#c98500', '#d55181', '#0ca30c', '#9085e9', '#e66767'],
}
export const STATUS_COLORS = { good: '#0ca30c', warning: '#fab219', serious: '#ec835a', critical: '#d03b3b' }

export const labelOf = (list, value) => list.find((x) => x.value === value)?.label ?? value
