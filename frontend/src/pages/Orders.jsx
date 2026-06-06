import { useEffect, useState } from 'react'
import Layout from '../components/Layout'
import api from '../api/axios'
import toast from 'react-hot-toast'
import {
  ShoppingBag, FileCheck, Download, Mail,
  Plus, ChevronDown, ChevronUp, Printer
} from 'lucide-react'

const STATUS_BADGE = {
  issued: 'badge-blue', delivered: 'badge-green',
  cancelled: 'badge-red', generated: 'badge-green',
  pending: 'badge-yellow',
}

export default function Orders() {
  const [orders,   setOrders]   = useState([])
  const [loading,  setLoading]  = useState(true)
  const [expanded, setExpanded] = useState(null)
  const [invModal, setInvModal] = useState(null)   // po_id
  const [invForm,  setInvForm]  = useState({ tax_percent: 18, notes: '' })
  const [saving,   setSaving]   = useState(false)
  const [emailing, setEmailing] = useState(null)

  const load = () => {
    setLoading(true)
    api.get('/orders').then(r => setOrders(r.data))
      .catch(() => toast.error('Failed to load'))
      .finally(() => setLoading(false))
  }
  useEffect(load, [])

  const handleCreateInvoice = async (e) => {
    e.preventDefault(); setSaving(true)
    try {
      await api.post(`/orders/create-invoice/${invModal}`, invForm)
      toast.success('Invoice generated!')
      setInvModal(null); load()
    } catch (err) { toast.error(err.response?.data?.detail || 'Failed') }
    finally { setSaving(false) }
  }

  const handleDownload = async (invId, invNum) => {
    try {
      const res = await api.get(`/orders/invoice/${invId}/pdf`, { responseType: 'blob' })
      const url = URL.createObjectURL(res.data)
      const a   = document.createElement('a')
      a.href = url; a.download = `invoice_${invNum}.pdf`; a.click()
      URL.revokeObjectURL(url)
    } catch { toast.error('Download failed') }
  }

  const handleEmail = async (invId) => {
    setEmailing(invId)
    try {
      const { data } = await api.post(`/orders/invoice/${invId}/send-email`)
      toast.success(data.message)
      load()
    } catch (err) { toast.error(err.response?.data?.detail || 'Email failed') }
    finally { setEmailing(null) }
  }

  const handlePrint = async (invId, invNum) => {
    try {
      const res = await api.get(`/orders/invoice/${invId}/pdf`, { responseType: 'blob' })
      const url = URL.createObjectURL(res.data)
      window.open(url, '_blank')
    } catch { toast.error('Print failed') }
  }

  return (
    <Layout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-navy">Purchase Orders & Invoices</h1>
        <p className="text-gray-500 text-sm mt-0.5">{orders.length} order{orders.length !== 1 ? 's' : ''}</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <span className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        </div>
      ) : orders.length === 0 ? (
        <div className="card flex flex-col items-center justify-center h-48 gap-2">
          <ShoppingBag className="w-10 h-10 text-gray-200" />
          <p className="text-gray-400 text-sm">No purchase orders yet. Approve a quotation to generate a PO.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map(o => (
            <div key={o.id} className="card p-0 overflow-hidden">
              {/* PO Row */}
              <div
                className="flex items-center gap-4 px-5 py-4 cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => setExpanded(expanded === o.id ? null : o.id)}
              >
                <div className="w-9 h-9 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <ShoppingBag className="w-5 h-5 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-navy font-mono text-sm">{o.po_number}</span>
                    <span className={STATUS_BADGE[o.status] || 'badge-gray'}>{o.status}</span>
                  </div>
                  <p className="text-sm text-gray-500 truncate">
                    {o.vendor} · {o.rfq_number} — {o.rfq_title}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="font-bold text-navy">₹{parseFloat(o.total_price).toLocaleString('en-IN')}</p>
                  <p className="text-xs text-gray-400">
                    {o.created_at ? new Date(o.created_at).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' }) : '—'}
                  </p>
                </div>
                {expanded === o.id
                  ? <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  : <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />}
              </div>

              {/* Expanded Invoice Section */}
              {expanded === o.id && (
                <div className="border-t border-gray-100 bg-gray-50 px-5 py-4">
                  {o.invoice ? (
                    <div className="flex items-center gap-4 flex-wrap">
                      <div className="flex items-center gap-3 flex-1">
                        <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                          <FileCheck className="w-4 h-4 text-green-600" />
                        </div>
                        <div>
                          <p className="font-semibold text-navy text-sm">{o.invoice.invoice_number}</p>
                          <p className="text-xs text-gray-500">
                            Total: ₹{parseFloat(o.invoice.total).toLocaleString('en-IN')} ·{' '}
                            <span className={STATUS_BADGE[o.invoice.status] || 'badge-gray'}>{o.invoice.status}</span>
                            {o.invoice.sent && <span className="ml-2 text-green-600">✓ Sent</span>}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleDownload(o.invoice.id, o.invoice.invoice_number)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-navy text-white rounded-lg text-sm hover:bg-slate-800 transition-colors"
                        >
                          <Download className="w-3.5 h-3.5" /> Download
                        </button>
                        <button
                          onClick={() => handlePrint(o.invoice.id, o.invoice.invoice_number)}
                          className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 text-gray-600 rounded-lg text-sm hover:bg-white transition-colors"
                        >
                          <Printer className="w-3.5 h-3.5" /> Print
                        </button>
                        <button
                          onClick={() => handleEmail(o.invoice.id)}
                          disabled={emailing === o.invoice.id}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-accent text-white rounded-lg text-sm hover:bg-blue-700 transition-colors disabled:opacity-60"
                        >
                          {emailing === o.invoice.id
                            ? <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            : <Mail className="w-3.5 h-3.5" />}
                          {emailing === o.invoice.id ? 'Sending...' : 'Email'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-gray-400">No invoice generated yet</p>
                      <button
                        onClick={() => { setInvModal(o.id); setInvForm({ tax_percent: 18, notes: '' }) }}
                        className="flex items-center gap-1.5 px-4 py-2 bg-accent text-white rounded-lg text-sm hover:bg-blue-700 transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" /> Generate Invoice
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Generate Invoice Modal */}
      {invModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl p-6">
            <h2 className="font-semibold text-navy mb-4">Generate Invoice</h2>
            <form onSubmit={handleCreateInvoice} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">GST / Tax (%)</label>
                <input
                  type="number" min="0" max="100" step="0.5"
                  value={invForm.tax_percent}
                  onChange={e => setInvForm(f => ({ ...f, tax_percent: parseFloat(e.target.value) }))}
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Notes (optional)</label>
                <textarea
                  rows={3} value={invForm.notes}
                  onChange={e => setInvForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="Payment terms, additional info..."
                  className="input-field resize-none"
                />
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setInvModal(null)} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" disabled={saving} className="btn-primary flex-1">
                  {saving
                    ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto block" />
                    : 'Generate'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  )
}