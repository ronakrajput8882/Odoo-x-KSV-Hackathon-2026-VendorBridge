import { useEffect, useState } from 'react'
import Layout from '../components/Layout'
import api from '../api/axios'
import toast from 'react-hot-toast'
import {
  Plus, X, FileText, Calendar, Users,
  Package, Trash2, ChevronRight, Clock
} from 'lucide-react'

const EMPTY_FORM = { title: '', description: '', deadline: '', vendor_ids: [], items: [] }
const EMPTY_ITEM = { name: '', qty: 1, unit: 'pcs' }
const UNITS = ['pcs', 'kg', 'ltr', 'box', 'set', 'unit', 'dozen', 'mtr']

const STATUS_BADGE = {
  open:    'badge-blue',
  closed:  'badge-gray',
  awarded: 'badge-green',
}

export default function RFQ() {
  const [rfqs,      setRfqs]      = useState([])
  const [vendors,   setVendors]   = useState([])
  const [loading,   setLoading]   = useState(true)
  const [statusF,   setStatusF]   = useState('')
  const [modal,     setModal]     = useState(false)
  const [form,      setForm]      = useState(EMPTY_FORM)
  const [items,     setItems]     = useState([{ ...EMPTY_ITEM }])
  const [saving,    setSaving]    = useState(false)
  const [detail,    setDetail]    = useState(null)   // view detail drawer

  const fetchRFQs = async () => {
    setLoading(true)
    try {
      const params = statusF ? { status: statusF } : {}
      const { data } = await api.get('/rfq', { params })
      setRfqs(data)
    } catch { toast.error('Failed to load RFQs') }
    finally { setLoading(false) }
  }

  const fetchVendors = async () => {
    try {
      const { data } = await api.get('/vendors', { params: { status: 'active' } })
      setVendors(data)
    } catch {}
  }

  useEffect(() => { fetchRFQs() }, [statusF])
  useEffect(() => { fetchVendors() }, [])

  const openModal = () => {
    setForm(EMPTY_FORM)
    setItems([{ ...EMPTY_ITEM }])
    setModal(true)
  }

  // ── Items helpers ──
  const addItem    = () => setItems(i => [...i, { ...EMPTY_ITEM }])
  const removeItem = (idx) => setItems(i => i.filter((_, j) => j !== idx))
  const updateItem = (idx, key, val) =>
    setItems(i => i.map((item, j) => j === idx ? { ...item, [key]: val } : item))

  // ── Vendor toggle ──
  const toggleVendor = (id) => {
    setForm(f => ({
      ...f,
      vendor_ids: f.vendor_ids.includes(id)
        ? f.vendor_ids.filter(v => v !== id)
        : [...f.vendor_ids, id]
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (items.some(i => !i.name.trim())) {
      toast.error('All items need a name')
      return
    }
    setSaving(true)
    try {
      await api.post('/rfq', {
        title:       form.title,
        description: form.description,
        deadline:    new Date(form.deadline).toISOString(),
        vendor_ids:  form.vendor_ids,
        items:       items.map(i => ({ ...i, qty: Number(i.qty) })),
      })
      toast.success('RFQ created!')
      setModal(false)
      fetchRFQs()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to create RFQ')
    } finally { setSaving(false) }
  }

  const handleClose = async (id) => {
    try {
      await api.patch(`/rfq/${id}/close`)
      toast.success('RFQ closed')
      fetchRFQs()
      if (detail?.id === id) setDetail(d => ({ ...d, status: 'closed' }))
    } catch { toast.error('Failed to close RFQ') }
  }

  const daysLeft = (deadline) => {
    const diff = Math.ceil((new Date(deadline) - new Date()) / (1000 * 60 * 60 * 24))
    return diff
  }

  return (
    <Layout>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-navy">RFQs</h1>
          <p className="text-gray-500 text-sm mt-0.5">{rfqs.length} request{rfqs.length !== 1 ? 's' : ''} for quotation</p>
        </div>
        <button onClick={openModal} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Create RFQ
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-5">
        {[['', 'All'], ['open', 'Open'], ['closed', 'Closed'], ['awarded', 'Awarded']].map(([val, label]) => (
          <button
            key={val}
            onClick={() => setStatusF(val)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              statusF === val
                ? 'bg-navy text-white'
                : 'bg-white text-gray-500 border border-gray-200 hover:border-navy hover:text-navy'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* RFQ Cards Grid */}
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <span className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        </div>
      ) : rfqs.length === 0 ? (
        <div className="card flex flex-col items-center justify-center h-48 gap-3">
          <FileText className="w-10 h-10 text-gray-200" />
          <p className="text-gray-400 text-sm">No RFQs found</p>
          <button onClick={openModal} className="btn-primary text-sm px-3 py-1.5">
            <Plus className="w-3 h-3 inline mr-1" /> Create First RFQ
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {rfqs.map(r => {
            const days = daysLeft(r.deadline)
            return (
              <div key={r.id} className="card hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-xs text-gray-400 font-mono">{r.rfq_number}</p>
                    <h3 className="font-semibold text-navy mt-0.5 line-clamp-1">{r.title}</h3>
                  </div>
                  <span className={STATUS_BADGE[r.status] || 'badge-gray'}>{r.status}</span>
                </div>

                {r.description && (
                  <p className="text-sm text-gray-500 mb-3 line-clamp-2">{r.description}</p>
                )}

                {/* Items preview */}
                <div className="flex flex-wrap gap-1 mb-3">
                  {(r.items || []).slice(0, 3).map((item, i) => (
                    <span key={i} className="inline-flex items-center gap-1 bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-full">
                      <Package className="w-3 h-3" /> {item.name} ×{item.qty}
                    </span>
                  ))}
                  {(r.items || []).length > 3 && (
                    <span className="text-xs text-gray-400">+{r.items.length - 3} more</span>
                  )}
                </div>

                {/* Deadline */}
                <div className={`flex items-center gap-1.5 text-xs mb-4 ${
                  days < 0 ? 'text-red-500' : days <= 2 ? 'text-orange-500' : 'text-gray-500'
                }`}>
                  <Clock className="w-3.5 h-3.5" />
                  {days < 0
                    ? `Expired ${Math.abs(days)}d ago`
                    : days === 0
                    ? 'Due today'
                    : `${days} day${days !== 1 ? 's' : ''} left`}
                  <span className="text-gray-300 mx-1">·</span>
                  <Calendar className="w-3.5 h-3.5 text-gray-400" />
                  <span className="text-gray-400">
                    {new Date(r.deadline).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </span>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <button
                    onClick={() => setDetail(r)}
                    className="btn-secondary flex-1 flex items-center justify-center gap-1 text-sm py-1.5"
                  >
                    View <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                  {r.status === 'open' && (
                    <button
                      onClick={() => handleClose(r.id)}
                      className="px-3 py-1.5 text-sm border border-gray-200 text-gray-500 rounded-lg hover:bg-gray-50 hover:text-red-500 transition-colors"
                    >
                      Close
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── CREATE RFQ MODAL ── */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-xl flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
              <h2 className="font-semibold text-navy">Create New RFQ</h2>
              <button onClick={() => setModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 p-6 space-y-5">

              {/* Title */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">RFQ Title *</label>
                <input
                  required
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="e.g. Office Furniture Procurement Q1 2025"
                  className="input-field"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
                <textarea
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  rows={2}
                  placeholder="Additional details or requirements..."
                  className="input-field resize-none"
                />
              </div>

              {/* Deadline */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Deadline *</label>
                <input
                  required
                  type="datetime-local"
                  value={form.deadline}
                  onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))}
                  className="input-field"
                />
              </div>

              {/* Items */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-medium text-gray-600">Items / Products *</label>
                  <button
                    type="button"
                    onClick={addItem}
                    className="text-xs text-accent hover:underline flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" /> Add Item
                  </button>
                </div>
                <div className="space-y-2">
                  {items.map((item, idx) => (
                    <div key={idx} className="flex gap-2 items-center bg-gray-50 rounded-lg p-2">
                      <input
                        required
                        value={item.name}
                        onChange={e => updateItem(idx, 'name', e.target.value)}
                        placeholder="Item name"
                        className="input-field flex-1 bg-white text-sm py-1.5"
                      />
                      <input
                        type="number"
                        min={1}
                        value={item.qty}
                        onChange={e => updateItem(idx, 'qty', e.target.value)}
                        className="input-field w-16 bg-white text-sm py-1.5 text-center"
                      />
                      <select
                        value={item.unit}
                        onChange={e => updateItem(idx, 'unit', e.target.value)}
                        className="input-field w-20 bg-white text-sm py-1.5"
                      >
                        {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                      </select>
                      {items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeItem(idx)}
                          className="text-gray-300 hover:text-red-400 flex-shrink-0"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Assign Vendors */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-2">
                  Assign Vendors
                  <span className="text-gray-400 font-normal ml-1">
                    ({form.vendor_ids.length} selected)
                  </span>
                </label>
                {vendors.length === 0 ? (
                  <p className="text-xs text-gray-400 bg-gray-50 p-3 rounded-lg">
                    No active vendors yet. Add vendors first.
                  </p>
                ) : (
                  <div className="grid grid-cols-2 gap-2 max-h-36 overflow-y-auto">
                    {vendors.map(v => (
                      <label
                        key={v.id}
                        className={`flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer transition-colors text-sm ${
                          form.vendor_ids.includes(v.id)
                            ? 'border-accent bg-blue-50 text-accent'
                            : 'border-gray-200 hover:border-gray-300 text-gray-700'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={form.vendor_ids.includes(v.id)}
                          onChange={() => toggleVendor(v.id)}
                          className="sr-only"
                        />
                        <Users className="w-3.5 h-3.5 flex-shrink-0" />
                        <span className="truncate font-medium">{v.name}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </form>

            <div className="flex gap-3 px-6 py-4 border-t border-gray-100 flex-shrink-0">
              <button type="button" onClick={() => setModal(false)} className="btn-secondary flex-1">Cancel</button>
              <button
                onClick={handleSubmit}
                disabled={saving}
                className="btn-primary flex-1"
              >
                {saving
                  ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto block" />
                  : 'Create RFQ'
                }
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── DETAIL DRAWER ── */}
      {detail && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/30">
          <div className="bg-white w-full max-w-md h-full overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white">
              <div>
                <p className="text-xs text-gray-400 font-mono">{detail.rfq_number}</p>
                <h2 className="font-semibold text-navy">{detail.title}</h2>
              </div>
              <button onClick={() => setDetail(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-5">
              <div className="flex items-center gap-2">
                <span className={STATUS_BADGE[detail.status] || 'badge-gray'}>{detail.status}</span>
                <span className="text-xs text-gray-400">
                  Created {new Date(detail.created_at).toLocaleDateString('en-IN')}
                </span>
              </div>

              {detail.description && (
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-1">Description</p>
                  <p className="text-sm text-gray-700">{detail.description}</p>
                </div>
              )}

              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">Deadline</p>
                <p className="text-sm text-gray-700">
                  {new Date(detail.deadline).toLocaleString('en-IN', {
                    day: '2-digit', month: 'short', year: 'numeric',
                    hour: '2-digit', minute: '2-digit'
                  })}
                </p>
              </div>

              <div>
                <p className="text-xs font-medium text-gray-500 mb-2">
                  Items ({(detail.items || []).length})
                </p>
                <div className="space-y-1.5">
                  {(detail.items || []).map((item, i) => (
                    <div key={i} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                      <span className="text-sm font-medium text-navy">{item.name}</span>
                      <span className="text-xs text-gray-500">{item.qty} {item.unit}</span>
                    </div>
                  ))}
                </div>
              </div>

              {detail.status === 'open' && (
                <button
                  onClick={() => handleClose(detail.id)}
                  className="w-full py-2 border border-red-200 text-red-500 rounded-lg text-sm hover:bg-red-50 transition-colors"
                >
                  Close RFQ
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}