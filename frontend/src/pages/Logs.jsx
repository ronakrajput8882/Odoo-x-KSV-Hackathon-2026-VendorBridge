import { useEffect, useState } from 'react'
import Layout from '../components/Layout'
import api from '../api/axios'
import toast from 'react-hot-toast'
import { Activity, Filter } from 'lucide-react'

const ACTION_BADGE = {
  CREATED: 'badge-green',
  UPDATED: 'badge-blue',
  DELETED: 'badge-red',
  SENT:    'badge-yellow',
}

const ACTION_ICON = {
  CREATED: '＋',
  UPDATED: '✎',
  DELETED: '✕',
  SENT:    '✉',
}

const ENTITY_COLOR = {
  Vendor:        'bg-purple-100 text-purple-700',
  RFQ:           'bg-blue-100 text-blue-700',
  Quotation:     'bg-yellow-100 text-yellow-700',
  Approval:      'bg-orange-100 text-orange-700',
  PurchaseOrder: 'bg-green-100 text-green-700',
  Invoice:       'bg-pink-100 text-pink-700',
}

const ROLE_BADGE = {
  admin:   'badge-red',
  officer: 'badge-blue',
  manager: 'badge-yellow',
  vendor:  'badge-green',
}

function timeAgo(ts) {
  if (!ts) return '—'
  const diff = Math.floor((Date.now() - new Date(ts)) / 1000)
  if (diff < 60)   return `${diff}s ago`
  if (diff < 3600) return `${Math.floor(diff/60)}m ago`
  if (diff < 86400) return `${Math.floor(diff/3600)}h ago`
  return new Date(ts).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' })
}

export default function Logs() {
  const [logs,      setLogs]      = useState([])
  const [loading,   setLoading]   = useState(true)
  const [entity,    setEntity]    = useState('')
  const [action,    setAction]    = useState('')
  const [limit,     setLimit]     = useState(50)

  const load = () => {
    setLoading(true)
    const params = { limit }
    if (entity) params.entity = entity
    if (action) params.action = action
    api.get('/logs', { params })
      .then(r => setLogs(r.data))
      .catch(() => toast.error('Failed to load logs'))
      .finally(() => setLoading(false))
  }

  useEffect(load, [entity, action, limit])

  return (
    <Layout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-navy">Activity Logs</h1>
          <p className="text-gray-500 text-sm mt-0.5">{logs.length} entries</p>
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400" />
          <select value={entity} onChange={e => setEntity(e.target.value)} className="input-field py-1.5 text-sm w-36">
            <option value="">All Entities</option>
            {['Vendor','RFQ','Quotation','Approval','PurchaseOrder','Invoice'].map(e => (
              <option key={e} value={e}>{e}</option>
            ))}
          </select>
          <select value={action} onChange={e => setAction(e.target.value)} className="input-field py-1.5 text-sm w-32">
            <option value="">All Actions</option>
            {['CREATED','UPDATED','DELETED','SENT'].map(a => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
          <select value={limit} onChange={e => setLimit(Number(e.target.value))} className="input-field py-1.5 text-sm w-24">
            {[25, 50, 100, 200].map(l => <option key={l} value={l}>Last {l}</option>)}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <span className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        </div>
      ) : logs.length === 0 ? (
        <div className="card flex flex-col items-center justify-center h-48 gap-2">
          <Activity className="w-10 h-10 text-gray-200" />
          <p className="text-gray-400 text-sm">No activity yet</p>
        </div>
      ) : (
        <div className="card p-0 overflow-hidden">
          <div className="divide-y divide-gray-50">
            {logs.map((log, idx) => (
              <div key={log.id} className="flex items-start gap-4 px-5 py-3.5 hover:bg-gray-50 transition-colors">
                {/* Timeline dot */}
                <div className="flex flex-col items-center flex-shrink-0 mt-1">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold
                    ${ACTION_BADGE[log.action]?.includes('green') ? 'bg-green-100 text-green-600' :
                      ACTION_BADGE[log.action]?.includes('blue')  ? 'bg-blue-100 text-blue-600'  :
                      ACTION_BADGE[log.action]?.includes('red')   ? 'bg-red-100 text-red-500'    :
                      'bg-yellow-100 text-yellow-600'}`}
                  >
                    {ACTION_ICON[log.action] || '•'}
                  </div>
                  {idx < logs.length - 1 && (
                    <div className="w-px flex-1 bg-gray-100 mt-1 min-h-4" />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 pb-1">
                  <div className="flex items-center gap-2 flex-wrap mb-0.5">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                      ENTITY_COLOR[log.entity] || 'bg-gray-100 text-gray-600'
                    }`}>
                      {log.entity}
                    </span>
                    <span className={ACTION_BADGE[log.action] || 'badge-gray'}>{log.action}</span>
                    {log.entity_id && (
                      <span className="text-xs text-gray-400">#{log.entity_id}</span>
                    )}
                  </div>
                  <p className="text-sm text-gray-700">{log.description || '—'}</p>
                  <div className="flex items-center gap-2 mt-1">
                    {log.user && (
                      <>
                        <span className="text-xs font-medium text-navy">{log.user.name}</span>
                        <span className={`text-xs ${ROLE_BADGE[log.user.role] || 'badge-gray'}`}>
                          {log.user.role}
                        </span>
                      </>
                    )}
                    <span className="text-xs text-gray-400 ml-auto">{timeAgo(log.timestamp)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {logs.length >= limit && (
            <div className="px-5 py-3 border-t border-gray-100 text-center">
              <button
                onClick={() => setLimit(l => l + 50)}
                className="text-sm text-accent hover:underline"
              >
                Load more
              </button>
            </div>
          )}
        </div>
      )}
    </Layout>
  )
}