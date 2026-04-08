import { useEffect, useState } from 'react'
import { getBedroomAuditLog, type BedroomAuditEntry } from '../../services/bedrooms'

const ACTION_LABELS: Record<BedroomAuditEntry['action'], string> = {
  CREATED: 'Creada',
  UPDATED: 'Actualizada',
  RESIDENT_ASSIGNED: 'Residente asignado',
  RESIDENT_REMOVED: 'Residente eliminado',
}

interface Props {
  readonly bedroomId: number
}

export function BedroomAuditLog({ bedroomId }: Props) {
  const [entries, setEntries] = useState<BedroomAuditEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    setError(null)
    getBedroomAuditLog(bedroomId, { signal: controller.signal })
      .then(setEntries)
      .catch((err: Error) => {
        if (err.name === 'AbortError') return
        setError('No se pudo cargar el historial.')
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [bedroomId])

  if (loading) {
    return <p className="text-sm text-gray-400 py-2">Cargando historial...</p>
  }

  if (error) {
    return <p className="text-sm text-red-500 py-2">{error}</p>
  }

  if (entries.length === 0) {
    return <p className="text-sm text-gray-400 py-2">Sin registros de auditoría.</p>
  }

  return (
    <ul className="space-y-2 mt-1" data-testid="audit-log-list">
      {entries.map((entry) => (
        <li key={entry.id} className="text-xs border border-gray-200 rounded-lg p-2 bg-gray-50">
          <div className="flex items-center justify-between gap-2">
            <span className="font-semibold text-gray-700">{ACTION_LABELS[entry.action]}</span>
            <span className="text-gray-400 shrink-0">{new Date(entry.timestamp).toLocaleString(navigator.language || 'es-ES')}</span>
          </div>
          {entry.performed_by && (
            <p className="text-gray-500 mt-0.5">Por: {entry.performed_by}</p>
          )}
        </li>
      ))}
    </ul>
  )
}
