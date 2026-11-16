import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { Camera, Pencil, Trash2 } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { Avatar, Button, Card, CardHeader, Field, Input, Textarea } from '@/components/ui'
import { supabase, errorMessage } from '@/lib/supabase'
import { formatDate } from '@/lib/format'

/** Kecilkan & potong persegi 256px (WebP) sebelum upload — hemat storage. */
async function toSquareWebp(file, size = 256) {
  const bmp = await createImageBitmap(file)
  const s = Math.min(bmp.width, bmp.height)
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  canvas.getContext('2d').drawImage(bmp, (bmp.width - s) / 2, (bmp.height - s) / 2, s, s, 0, 0, size, size)
  return new Promise((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error('Gagal memproses gambar'))), 'image/webp', 0.85))
}

export default function Profil() {
  const { profile, user, updateProfile } = useAuth()
  const [editing, setEditing] = useState(false)
  const [v, setV] = useState({ business_name: '', description: '' })
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef(null)

  useEffect(() => {
    if (profile) setV({ business_name: profile.business_name, description: profile.description })
  }, [profile])

  const save = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      await updateProfile({ business_name: v.business_name.trim(), description: v.description.trim() })
      toast.success('Profil diperbarui')
      setEditing(false)
    } catch (err) {
      toast.error(errorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  const upload = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (!file.type.startsWith('image/')) return toast.error('File harus berupa gambar')
    if (file.size > 8 * 1024 * 1024) return toast.error('Ukuran maksimal 8 MB')
    setUploading(true)
    try {
      const blob = await toSquareWebp(file)
      const path = `${user.id}/avatar-${Date.now()}.webp`
      const { error } = await supabase.storage.from('avatars').upload(path, blob, { contentType: 'image/webp', upsert: true })
      if (error) throw error
      const { data } = supabase.storage.from('avatars').getPublicUrl(path)
      const old = profile.avatar_url?.split('/avatars/')[1]
      await updateProfile({ avatar_url: data.publicUrl })
      if (old) await supabase.storage.from('avatars').remove([decodeURIComponent(old)])
      toast.success('Foto profil diperbarui')
    } catch (err) {
      toast.error(errorMessage(err))
    } finally {
      setUploading(false)
    }
  }

  const removePhoto = async () => {
    const old = profile.avatar_url?.split('/avatars/')[1]
    try {
      await updateProfile({ avatar_url: null })
      if (old) await supabase.storage.from('avatars').remove([decodeURIComponent(old)])
      toast.success('Foto dihapus')
    } catch (err) {
      toast.error(errorMessage(err))
    }
  }

  if (!profile) return null

  return (
    <Card>
      <CardHeader
        title="Profil"
        subtitle="Identitas usaha yang tampil di aplikasi."
        action={!editing && <Button variant="secondary" size="sm" onClick={() => setEditing(true)}><Pencil className="h-3.5 w-3.5" /> Edit profil</Button>}
      />
      <div className="p-5">
        <div className="flex flex-col items-start gap-5 sm:flex-row sm:items-center">
          <div className="relative">
            <Avatar src={profile.avatar_url} name={profile.business_name || profile.username} size={96} />
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="absolute -bottom-1 -right-1 rounded-full bg-brand-500 p-2 text-white shadow-md ring-4 ring-white hover:bg-brand-600 disabled:opacity-60 dark:ring-surface-dark"
              title="Ganti foto"
            >
              <Camera className="h-4 w-4" />
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={upload} />
          </div>
          <div className="min-w-0">
            <p className="text-lg font-extrabold">{profile.business_name || 'Nama usaha belum diisi'}</p>
            <p className="muted text-sm">@{profile.username} · {user.email}</p>
            <p className="faint mt-0.5 text-xs">Bergabung {formatDate(profile.created_at)}</p>
            {profile.avatar_url && (
              <button onClick={removePhoto} className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-[#d03b3b] hover:underline">
                <Trash2 className="h-3 w-3" /> Hapus foto
              </button>
            )}
          </div>
        </div>

        {editing ? (
          <form onSubmit={save} className="mt-6 space-y-4">
            <Field label="Nama usaha">
              <Input value={v.business_name} onChange={(e) => setV({ ...v, business_name: e.target.value })} maxLength={80} />
            </Field>
            <Field label="Deskripsi" hint={`${v.description.length}/500`}>
              <Textarea value={v.description} onChange={(e) => setV({ ...v, description: e.target.value })} maxLength={500} placeholder="Ceritakan singkat layanan usaha Anda" />
            </Field>
            <p className="faint text-xs">Username dan email diubah di menu Privasi.</p>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" type="button" onClick={() => setEditing(false)}>Batal</Button>
              <Button type="submit" loading={saving}>Simpan</Button>
            </div>
          </form>
        ) : (
          <div className="mt-6">
            <p className="label">Deskripsi</p>
            <p className="muted whitespace-pre-line text-sm">{profile.description || '—'}</p>
          </div>
        )}
      </div>
    </Card>
  )
}
