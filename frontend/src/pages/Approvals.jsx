import { useEffect, useState } from 'react'
import Layout from '../components/Layout'
import api from '../api/axios'
import toast from 'react-hot-toast'
import { CheckCircle, XCircle, Clock, MessageSquare } from 'lucide-react'

const STATUS_BADGE = { pending: 'badge-yellow', approved: 'badge-green', rejected: 'badge-red' }

export default function Approvals() {
  const [items,    setItems]   = useState([])
  const [loading,  setLoading] = useState(true)
  const [modal,    setModal]   = useState(null)  // { id, action }
  const [remarks,  setRemarks] = useState('')
  const [saving,   setSaving]  = useState(false)

  const load = () => {
    setLoading(true)
    api.get('/approvals').then(r => setItems(r.data))
      .catch(() => toast.error('Failed to load'))
      .finally(() => setLoading(false))
  }
  useEffect(load, [])

  const handleAction = async () => {
    setSaving(true)
    try {
      await api.patch(`/approvals/${modal.id}/${modal.action}`, { remarks })
      toast.success(`Quotation ${modal.action}d!`)
      setModal(null); setRemarks(''); load()
    } catch (err) { toast.error(err.response?.data?.detail || 'Failed') }
    finally { setSaving(false) }
  }

  const pending  = items.filter(i => i.status === 'pending')
  const actioned = items.filter(i => i.status !== 'pending')

  return (
    <Layout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-navy">Approvals</h1>
        <p className="text-gray-500 text-sm mt-0.5">{pending.length} pending action{pending.length !== 1 ? 's' : ''}</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <span className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* Pending */}
          {pending.length > 0 && (
            <div className="mb-6">
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Pending</h2>
              <div className="space-y-3">
                {pending.map(a => (
                  <div key={a.id} className="card flex items-center gap-4 flex-wrap">
                    <div className="w-9 h-9 bg-yellow-100 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Clock className="w-5 h-5 text-yellow-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-navy">{a.quotation?.vendor_name}</p>
                        <span className="text-xs font-mono text-gray-400">{a.quotation?.rfq_number}</span>
                      </div>
                      <p className="text-sm text-gray-500 truncate">{a.quotation?.rfq_title}</p>
                      <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
                        <span className="font-bold text-navy text-sm">
                          ₹{parseFloat(a.quotation?.total_price || 0).toLocaleString('en-IN')}
                        </span>
                        <span>Delivery: {a.quotation?.delivery_days}d</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => { setModal({ id: a.id, action: 'approve' }); setRemarks('') }}
                        className="flex items-center gap-1.5 px-4 py-2 bg-green-500 text-white rounded-lg text-sm font-medium hover:bg-green-600 transition-colors"
                      >
                        <CheckCircle className="w-4 h-4" /> Approve
                      </button>
                      <button
                        onClick={() => { setModal({ id: a.id, action: 'reject' }); setRemarks('') }}
                        className="flex items-center gap-1.5 px-4 py-2 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600 transition-colors"
                      >
                        <XCircle className="w-4 h-4" /> Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* History */}
          {actioned.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">History</h2>
              <div className="card p-0 overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      {['Vendor', 'RFQ', 'Amount', 'Status', 'Remarks', 'Date'].map(h => (
                        <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {actioned.map(a => (
                      <tr key={a.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium text-navy">{a.quotation?.vendor_name}</td>
                        <td className="px-4 py-3 font-mono text-xs text-gray-500">{a.quotation?.rfq_number}</td>
                        <td className="px-4 py-3 font-bold text-navy">₹{parseFloat(a.quotation?.total_price || 0).toLocaleString('en-IN')}</td>
                        <td className="px-4 py-3"><span className={STATUS_BADGE[a.status]}>{a.status}</span></td>
                        <td className="px-4 py-3 text-gray-500 text-xs max-w-40 truncate">{a.remarks || '—'}</td>
                        <td className="px-4 py-3 text-xs text-gray-400">
                          {a.timestamp ? new Date(a.timestamp).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {items.length === 0 && (
            <div className="card flex flex-col items-center justify-center h-48 gap-2">
              <CheckCircle className="w-10 h-10 text-gray-200" />
              <p className="text-gray-400 text-sm">No approvals yet</p>
            </div>
          )}
        </>
      )}

      {/* Action Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl p-6">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 ${modal.action === 'approve' ? 'bg-green-100' : 'bg-red-100'}`}>
              {modal.action === 'approve'
                ? <CheckCircle className="w-6 h-6 text-green-600" />
                : <XCircle className="w-6 h-6 text-red-500" />}
            </div>
            <h3 className="font-semibold text-navy text-center mb-4 capitalize">{modal.action} Quotation?</h3>
            <div className="mb-4">
              <label className="block text-xs font-medium text-gray-600 mb-1">
                <MessageSquare className="w-3 h-3 inline mr-1" />
                Remarks {modal.action === 'reject' ? '*' : '(optional)'}
              </label>
              <textarea
                rows={3} value={remarks}
                onChange={e => setRemarks(e.target.value)}
                placeholder={modal.action === 'approve' ? 'Any notes...' : 'Reason for rejection...'}
                className="input-field resize-none"
              />
            </div>
            <div className="flex gap-3">
              <button onClick={() => setModal(null)} className="btn-secondary flex-1">Cancel</button>
              <button
                onClick={handleAction} disabled={saving}
                className={`flex-1 text-white px-4 py-2 rounded-lg font-medium transition-colors ${modal.action === 'approve' ? 'bg-green-500 hover:bg-green-600' : 'bg-red-500 hover:bg-red-600'}`}
              >
                {saving
                  ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto block" />
                  : `Confirm ${modal.action}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}