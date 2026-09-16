import { useEffect, useState } from 'react'

interface TimerProps {
  expiresAt: string | null | undefined
}

const getRemainingSeconds = (expiresAt: string | null | undefined): number => {
  if (!expiresAt) {
    return 0
  }
  return Math.max(0, Math.ceil((Date.parse(expiresAt) - Date.now()) / 1000))
}

export function Timer({ expiresAt }: TimerProps) {
  const [seconds, setSeconds] = useState(() => getRemainingSeconds(expiresAt))

  useEffect(() => {
    const updateTimeout = window.setTimeout(() => {
      setSeconds(getRemainingSeconds(expiresAt))
    }, 0)
    const intervalId = window.setInterval(() => {
      setSeconds(getRemainingSeconds(expiresAt))
    }, 1000)
    return () => {
      window.clearTimeout(updateTimeout)
      window.clearInterval(intervalId)
    }
  }, [expiresAt])

  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  const isUrgent = seconds < 60
  const formatted = `${String(minutes).padStart(2, '0')}:${String(
    remainingSeconds,
  ).padStart(2, '0')}`

  return (
    <time className={`inline-flex rounded-md border px-2.5 py-1 font-mono text-sm font-semibold ${
      isUrgent
        ? 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300'
        : 'border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200'
    }`} dateTime={expiresAt ?? undefined} aria-label={`Tiempo restante ${formatted}`}>
      {formatted}
    </time>
  )
}
