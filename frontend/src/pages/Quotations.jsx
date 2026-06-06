import { useEffect, useState } from 'react'
import Layout from '../components/Layout'
import api from '../api/axios'
import toast from 'react-hot-toast'
import { useAuth } from '../context/AuthContext'
import {
  Plus, X, FileText, Edit2, CheckCircle,
  Truck, MessageSquare, Clock, DollarSign
} from 'lucide-react'

const STATUS_BADGE = {
  pending:  'badge-yellow',
  accepted: 'badge-green',
  rejected: 'badge-red',
}

function VendorView() {
  const [rfqs,      setRfqs]      = useState([])
  const [myQuotes,  setMyQuotes]  = useState([])
  const [loading,   setLoading]   = useState(true)
  const [modal,     setModal]     = useState(false)
  const [selRfq,    setSelRfq]    = useState(null)
  const [editId,    setEditId]    = useState(null)
  const [form,      setForm]      = useState({ total_price: '', delivery_days: 7, notes: '' })
  const [saving,    setSaving]    = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const [r, q] = await Promise.all([api.get('/rfq'), api.get('/quotations')])
      setRfqs(r.data); setMyQuotes(q.data)
    } catch { toast.error('Failed to load') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const myQuoteFor = (id) => myQuotes.find(q => q.rfq_id === id)

  const openForm = (rfq) => {
    const eq = myQuoteFor(rfq.id)
    setSelRfq(rfq)
    setEditId(eq?.id || null)
    setForm(eq
      ? { total_price: eq.total_price, delivery_days: eq.delivery_days, notes: eq.notes || '' }
      : { total_price: '', delivery_days: 7, notes: '' }
    )
    setModal(true)
  }

  const handleSave = async (e) => {
  e.preventDefault()
  setSaving(true)

  try {
    if (editId) {
      await api.put(`/quotations/${editId}`, {
        total_price: parseFloat(form.total_price),
        delivery_days: parseInt(form.delivery_days),
        notes: form.notes || ""
      })

      toast.success("Quotation updated!")
    } else {
      await api.post("/quotations/", {
        rfq_id: selRfq.id,
        unit_price: parseFloat(form.total_price),
        total_price: parseFloat(form.total_price),
        delivery_days: parseInt(form.delivery_days),
        notes: form.notes || ""
      })

      toast.success("Quotation submitted!")
    }

    setModal(false)
    load()
  } catch (err) {
    console.error(err)

    toast.error(
      err?.response?.data?.detail ||
      "Save failed"
    )
  } finally {
    setSaving(false)
  }
}

  if (loading) return (
    <div className="flex items-center justify-center h-48">
      <span className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {rfqs.length === 0 ? (
          <div className="col-span-full card text-center py-12">
            <FileText className="w-10 h-10 text-gray-200 mx-auto mb-2" />
            <p className="text-gray-400 text-sm">No RFQs assigned to you yet</p>
          </div>
        ) : rfqs.map(rfq => {
          const mq = myQuoteFor(rfq.id)
          return (
            <div key={rfq.id} className="card">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="text-xs font-mono text-gray-400">{rfq.rfq_number}</p>
                  <h3 className="font-semibold text-navy line-clamp-1 mt-0.5">{rfq.title}</h3>
                </div>
                <span className={rfq.status === 'open' ? 'badge-blue' : 'badge-gray'}>{rfq.status}</span>
              </div>

              {/* Items chips */}
              <div className="flex flex-wrap gap-1 mb-3">
                {(rfq.items || []).slice(0, 3).map((item, i) => (
                  <span key={i} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                    {item.name} ×{item.qty}
                  </span>
                ))}
                {(rfq.items || []).length > 3 && (
                  <span className="text-xs text-gray-400">+{rfq.items.length - 3} more</span>
                )}
              </div>

              {/* Deadline */}
              <div className="flex items-center gap-1 text-xs text-gray-500 mb-4">
                <Clock className="w-3 h-3" />
                Due: {new Date(rfq.deadline).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
              </div>

              {/* My quote status */}
              {mq ? (
                <div className="bg-green-50 rounded-lg p-3 mb-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-green-700 flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" /> Quote Submitted
                    </span>
                    <span className={STATUS_BADGE[mq.status]}>{mq.status}</span>
                  </div>
                  <p className="text-lg font-bold text-green-800">
                    ₹{parseFloat(mq.total_price).toLocaleString('en-IN')}
                  </p>
                  <p className="text-xs text-green-600">Delivery: {mq.delivery_days} days</p>
                </div>
              ) : (
                <div className="bg-gray-50 rounded-lg p-3 mb-3 text-center">
                  <p className="text-xs text-gray-400">No quotation submitted yet</p>
                </div>
              )}

              {rfq.status === 'open' && (
                <button
                  onClick={() => openForm(rfq)}
                  className={`w-full flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-colors ${
                    mq
                      ? 'border border-gray-200 text-gray-600 hover:bg-gray-50'
                      : 'btn-primary'
                  }`}
                >
                  {mq
                    ? <><Edit2 className="w-3.5 h-3.5" /> Edit Quote</>
                    : <><Plus className="w-3.5 h-3.5" /> Submit Quote</>
                  }
                </button>
              )}
            </div>
          )
        })}
      </div>

      {/* Submit / Edit Modal */}
      {modal && selRfq && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div>
                <h2 className="font-semibold text-navy">
                  {editId ? 'Edit Quotation' : 'Submit Quotation'}
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  {selRfq.rfq_number} — {selRfq.title}
                </p>
              </div>
              <button onClick={() => setModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4">
              {/* Items reference */}
              <div className="bg-blue-50 rounded-lg p-3">
                <p className="text-xs font-medium text-blue-700 mb-2">Items Requested:</p>
                <div className="flex flex-wrap gap-1">
                  {(selRfq.items || []).map((item, i) => (
                    <span key={i} className="text-xs bg-white text-blue-600 px-2 py-0.5 rounded border border-blue-100">
                      {item.name} — {item.qty} {item.unit}
                    </span>
                  ))}
                </div>
              </div>

              {/* Total Price */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Total Quote Price (₹) *</label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="number" min="0" step="0.01" required
                    value={form.total_price}
                    onChange={e => setForm(f => ({ ...f, total_price: e.target.value }))}
                    placeholder="e.g. 45000"
                    className="input-field pl-9"
                  />
                </div>
              </div>

              {/* Delivery Days */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Delivery Timeline (days) *</label>
                <div className="relative">
                  <Truck className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="number" min="1" required
                    value={form.delivery_days}
                    onChange={e => setForm(f => ({ ...f, delivery_days: e.target.value }))}
                    className="input-field pl-9"
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Notes / Terms</label>
                <div className="relative">
                  <MessageSquare className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                  <textarea
                    rows={3}
                    value={form.notes}
                    onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                    placeholder="Payment terms, warranty, lead time details..."
                    className="input-field pl-9 resize-none"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setModal(false)} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" disabled={saving} className="btn-primary flex-1">
                  {saving
                    ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto block" />
                    : editId ? 'Update Quote' : 'Submit Quote'
                  }
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}

function StaffView() {
  const [quotations, setQuotations] = useState([])
  const [rfqs,       setRfqs]       = useState([])
  const [rfqFilter,  setRfqFilter]  = useState('')
  const [loading,    setLoading]    = useState(true)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const params = rfqFilter ? { params: { rfq_id: rfqFilter } } : {}
        const [q, r] = await Promise.all([
          api.get('/quotations', params),
          api.get('/rfq')
        ])
        setQuotations(q.data); setRfqs(r.data)
      } catch { toast.error('Failed to load quotations') }
      finally { setLoading(false) }
    }
    load()
  }, [rfqFilter])

  return (
    <>
      <div className="mb-4 max-w-xs">
        <select
          value={rfqFilter}
          onChange={e => setRfqFilter(e.target.value)}
          className="input-field"
        >
          <option value="">All RFQs</option>
          {rfqs.map(r => (
            <option key={r.id} value={r.id}>{r.rfq_number} — {r.title}</option>
          ))}
        </select>
      </div>

      <div className="card p-0 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <span className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          </div>
        ) : quotations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 gap-2">
            <MessageSquare className="w-10 h-10 text-gray-200" />
            <p className="text-gray-400 text-sm">No quotations received yet</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {['RFQ', 'Vendor', 'Total Price', 'Delivery', 'Notes', 'Status', 'Date'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {quotations.map(q => (
                <tr key={q.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-mono text-xs font-medium text-navy">{q.rfq?.rfq_number || `RFQ-${q.rfq_id}`}</p>
                    <p className="text-xs text-gray-400 truncate max-w-36">{q.rfq?.title || '—'}</p>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 bg-accent/10 rounded-lg flex items-center justify-center">
                        <span className="text-accent text-xs font-bold">
                          {(q.vendor?.name || '?')[0]}
                        </span>
                      </div>
                      <span className="font-medium text-navy">{q.vendor?.name || '—'}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-bold text-navy">
                    ₹{parseFloat(q.total_price).toLocaleString('en-IN')}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 text-gray-600">
                      <Truck className="w-3.5 h-3.5 text-gray-400" />
                      {q.delivery_days}d
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-xs text-gray-500 max-w-40 truncate">{q.notes || '—'}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className={STATUS_BADGE[q.status] || 'badge-gray'}>{q.status}</span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-400">
                    {q.submitted_at
                      ? new Date(q.submitted_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
                      : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  )
}

// ─────────────────────────────────────────
//  PAGE WRAPPER
// ─────────────────────────────────────────
export default function Quotations() {
  const { user } = useAuth()
  return (
    <Layout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-navy">Quotations</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {user?.role === 'vendor'
              ? 'Submit and manage your quotations'
              : 'All vendor quotations received'}
          </p>
        </div>
      </div>
      {user?.role === 'vendor' ? <VendorView /> : <StaffView />}
    </Layout>
  )
}