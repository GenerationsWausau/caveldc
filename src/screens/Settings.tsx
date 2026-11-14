import { Download, Upload } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { exportBackup, parseBackup, restoreBackup, type Backup } from '../db'
import { todayKey } from '../logic'

export function Settings() {
  const fileInput = useRef<HTMLInputElement>(null)
  const [pending, setPending] = useState<Backup | null>(null)
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null)
  const [persisted, setPersisted] = useState<boolean | null>(null)

  useEffect(() => {
    navigator.storage?.persisted?.().then(setPersisted)
  }, [])

  const download = async () => {
    const backup = await exportBackup()
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `the-cave-backup-${todayKey()}.json`
    a.click()
    URL.revokeObjectURL(url)
    setMessage({ kind: 'ok', text: 'Backup saved to your downloads.' })
  }

  const pickFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try {
      setPending(parseBackup(await file.text()))
      setMessage(null)
    } catch (err) {
      setMessage({ kind: 'error', text: (err as Error).message })
    }
  }

  const restore = async () => {
    if (!pending) return
    await restoreBackup(pending)
    setPending(null)
    setMessage({ kind: 'ok', text: 'Backup restored.' })
  }

  return (
    <>
      <header className="page-head">
        <h1>Settings</h1>
      </header>

      <div className="section-head">
        <h2>Backup</h2>
      </div>
      <div className="card">
        <p>
          Everything lives on this phone only. Save a backup file now and then so a lost or reset phone
          doesn't take your history with it.
        </p>
        <button className="btn btn-block" onClick={download}>
          <Download size={18} aria-hidden /> Save a backup
        </button>
        <button className="btn btn-block" onClick={() => fileInput.current?.click()}>
          <Upload size={18} aria-hidden /> Restore from a backup
        </button>
        <input ref={fileInput} type="file" accept="application/json,.json" hidden onChange={pickFile} />

        {pending && (
          <div className="confirm">
            <p>
              This backup from {new Date(pending.exportedAt).toLocaleDateString()} has {pending.habits.length}{' '}
              habits and {pending.entries.length} completions. Restoring replaces everything on this phone.
            </p>
            <div className="confirm-actions">
              <button className="btn" onClick={() => setPending(null)}>
                Cancel
              </button>
              <button className="btn btn-danger" onClick={restore}>
                Replace my data
              </button>
            </div>
          </div>
        )}
        {message && (
          <p className={message.kind === 'error' ? 'form-error' : 'form-ok'} role="status">
            {message.text}
          </p>
        )}
      </div>

      <div className="section-head">
        <h2>About</h2>
      </div>
      <div className="card">
        <p>The Cave · version {__APP_VERSION__}</p>
        {persisted !== null && (
          <p className="hint">
            {persisted
              ? 'Storage is protected: the phone will not clear your data to free up space.'
              : 'Storage is not protected yet. Adding The Cave to your home screen usually fixes this.'}
          </p>
        )}
      </div>
    </>
  )
}
