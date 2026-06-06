import { useEffect, useState } from 'react'
import Layout from '../components/Layout'
import api from '../api/axios'
import toast from 'react-hot-toast'
import {
  Star, Truck, DollarSign, CheckCircle,
  Award, ArrowUpDown, FileText
} from 'lucide-react'

const STATUS_BADGE = {
  submitted: 'badge-yellow',
  selected:  'badge-green',
  rejected:  'badge-red',
}

export default function Compare() {
  const [rfqs,      setRfqs]      = useState([])
  const [selRfq,    setSelRfq]    = useState('')
  const [data,      setData]      = useState(null)
  const [loading,   setLoading]   = useState(false)
  const [sortBy,    setSortBy]    = useState('price')   // 'price' | 'delivery'
  const [confirm,   setConfirm]   = useState(null)
  const [selecting, setSelecting] = useState(false)

  useEffect(() => {
    api.get('/rfq').then(r => setRfqs(r.data)).catch(() => {})
  }, [])

  const loadCompare = (id) => {
    if (!id) { setData(null); return }
    setLoading(true)
    api.get(`/quotations/compare/${id}`)
      .then(r => setData(r.data))
      .catch(() => toast.error('Failed to load comparison'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadCompare(selRfq) }, [selRfq])

  const handleSelect = async () => {
    if (!confirm) return
    setSelecting(true)
    try {
      await api.patch(`/quotations/${confirm.id}/select`)
      toast.success(`${confirm.vendor_name} selected as winner!`)
      setConfirm(null)
      loadCompare(selRfq)
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Selection failed')
    } finally { setSelecting(false) }
  }

  const sorted = data
    ? [...data.quotations].sort((a, b) =>
        sortBy === 'price'
          ? a.total_price - b.total_price
          : a.delivery_days - b.delivery_days
      )
    : []

  const alreadySelected = data?.quotations.some(q => q.status === 'selected')

  return (
    <Layout>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-navy">Quotation Comparison</h1>
          <p className="text-gray-500 text-sm mt-0.5">Compare vendor quotes side-by-side and select the best offer</p>
        </div>
        {data && data.quotations.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">Sort by:</span>
            {[['price', DollarSign, 'Price'], ['delivery', Truck, 'Delivery']].map(([val, Icon, label]) => (
              <button
                key={val}
                onClick={() => setSortBy(val)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  sortBy === val
                    ? 'bg-navy text-white'
                    : 'bg-white border border-gray-200 text-gray-500 hover:text-navy'
                }`}
              >
                <Icon className="w-3.5 h-3.5" /> {label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* RFQ Selector */}
      <div className="card mb-6">
        <label className="block text-xs font-medium text-gray-600 mb-2">Select RFQ to Compare</label>
        <select
          value={selRfq}
          onChange={e => setSelRfq(e.target.value)}
          className="input-field max-w-lg"
        >
          <option value="">— Choose an RFQ —</option>
          {rfqs.map(r => (
            <option key={r.id} value={r.id}>
              {r.rfq_number} — {r.title} [{r.status}]
            </option>
          ))}
        </select>
      </div>

      {/* Empty state */}
      {!selRfq && (
        <div className="card flex flex-col items-center justify-center h-48 gap-3">
          <ArrowUpDown className="w-10 h-10 text-gray-200" />
          <p className="text-gray-400 text-sm">Select an RFQ above to compare its quotations</p>
        </div>
      )}

      {/* Loading */}
      {selRfq && loading && (
        <div className="flex items-center justify-center h-48">
          <span className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Comparison */}
      {data && !loading && (
        <>
          {/* Summary bar */}
          <div className="bg-blue-50 border border-blue-100 rounded-xl px-5 py-3 mb-5 flex flex-wrap items-center gap-x-6 gap-y-2">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-500" />
              <span className="font-semibold text-navy text-sm">{data.rfq.rfq_number}</span>
              <span className="text-gray-500 text-sm truncate max-w-48">— {data.rfq.title}</span>
            </div>
            <div className="flex items-center gap-6 ml-auto text-sm flex-wrap">
              <span className="text-gray-500">
                <span className="font-semibold text-navy">{data.quotations.length}</span> vendor{data.quotations.length !== 1 ? 's' : ''} quoted
              </span>
              {data.min_price !== null && (
                <span className="text-green-600 font-medium">
                  Best price: ₹{parseFloat(data.min_price).toLocaleString('en-IN')}
                </span>
              )}
              {data.min_delivery !== null && (
                <span className="text-blue-600 font-medium">
                  Fastest: {data.min_delivery} days
                </span>
              )}
            </div>
          </div>

          {/* No quotes yet */}
          {data.quotations.length === 0 ? (
            <div className="card text-center py-12">
              <FileText className="w-10 h-10 text-gray-200 mx-auto mb-2" />
              <p className="text-gray-400 text-sm">No quotations received for this RFQ yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {sorted.map((q, idx) => {
                const isLowest   = q.total_price   === data.min_price
                const isFastest  = q.delivery_days === data.min_delivery
                const isSelected = q.status === 'selected'
                const isRejected = q.status === 'rejected'

                return (
                  <div
                    key={q.id}
                    className={`card relative transition-all ${
                      isSelected  ? 'ring-2 ring-green-400 shadow-md shadow-green-100' :
                      isRejected  ? 'opacity-40' :
                      'hover:shadow-md'
                    }`}
                  >
                    {/* Rank badge */}
                    {!isRejected && (
                      <div className={`absolute -top-2.5 -left-2.5 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white shadow ${
                        idx === 0 ? 'bg-yellow-400' : idx === 1 ? 'bg-gray-400' : 'bg-orange-300'
                      }`}>
                        {idx + 1}
                      </div>
                    )}

                    {/* Winner banner */}
                    {isSelected && (
                      <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-green-500 text-white text-xs px-3 py-0.5 rounded-full flex items-center gap-1 shadow">
                        <Award className="w-3 h-3" /> Winner
                      </div>
                    )}

                    {/* Vendor header */}
                    <div className="flex items-start gap-3 mb-4 mt-2">
                      <div className="w-10 h-10 bg-accent/10 rounded-xl flex items-center justify-center flex-shrink-0">
                        <span className="text-accent font-bold text-sm">{q.vendor_name[0]}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-navy truncate">{q.vendor_name}</p>
                        <p className="text-xs text-gray-400">{q.vendor_category}</p>
                        <div className="flex items-center gap-0.5 mt-0.5">
                          {[1, 2, 3, 4, 5].map(s => (
                            <Star key={s} className={`w-3 h-3 ${
                              s <= Math.round(q.vendor_rating)
                                ? 'text-yellow-400 fill-yellow-400'
                                : 'text-gray-200 fill-gray-200'
                            }`} />
                          ))}
                          <span className="text-xs text-gray-400 ml-1">{q.vendor_rating}</span>
                        </div>
                      </div>
                      <span className={STATUS_BADGE[q.status] || 'badge-gray'}>{q.status}</span>
                    </div>

                    {/* Price block */}
                    <div className={`rounded-xl p-3 mb-3 ${isLowest ? 'bg-green-50 border border-green-100' : 'bg-gray-50'}`}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-gray-500 font-medium">Total Price</span>
                        {isLowest && (
                          <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">✓ Lowest</span>
                        )}
                      </div>
                      <p className={`text-2xl font-bold ${isLowest ? 'text-green-700' : 'text-navy'}`}>
                        ₹{parseFloat(q.total_price).toLocaleString('en-IN')}
                      </p>
                      {q.unit_price && (
                        <p className="text-xs text-gray-400 mt-0.5">
                          Unit: ₹{parseFloat(q.unit_price).toLocaleString('en-IN')}
                        </p>
                      )}
                    </div>

                    {/* Delivery block */}
                    <div className={`rounded-xl p-3 mb-3 ${isFastest ? 'bg-blue-50 border border-blue-100' : 'bg-gray-50'}`}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-gray-500 font-medium">Delivery</span>
                        {isFastest && (
                          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">✓ Fastest</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Truck className={`w-4 h-4 ${isFastest ? 'text-blue-500' : 'text-gray-400'}`} />
                        <span className={`text-xl font-bold ${isFastest ? 'text-blue-700' : 'text-navy'}`}>
                          {q.delivery_days} days
                        </span>
                      </div>
                    </div>

                    {/* Notes */}
                    {q.notes && (
                      <p className="text-xs text-gray-500 mb-3 bg-gray-50 rounded-lg p-2.5 line-clamp-2 italic">
                        "{q.notes}"
                      </p>
                    )}

                    {/* Action button */}
                    {!isRejected && !isSelected && !alreadySelected && (
                      <button
                        onClick={() => setConfirm(q)}
                        className="w-full btn-primary flex items-center justify-center gap-2 py-2"
                      >
                        <CheckCircle className="w-4 h-4" /> Select as Winner
                      </button>
                    )}
                    {isSelected && (
                      <div className="w-full flex items-center justify-center gap-2 py-2 bg-green-500 text-white rounded-lg text-sm font-medium">
                        <Award className="w-4 h-4" /> Winner Selected
                      </div>
                    )}
                    {!isSelected && !isRejected && alreadySelected && (
                      <div className="w-full flex items-center justify-center py-2 bg-gray-100 text-gray-400 rounded-lg text-sm">
                        Not Selected
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      {/* Confirm Modal */}
      {confirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl p-6">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Award className="w-6 h-6 text-green-600" />
            </div>
            <h3 className="font-semibold text-navy text-center mb-1">Confirm Winner?</h3>
            <p className="text-sm text-center text-gray-500 mb-3">
              <span className="font-semibold text-navy">{confirm.vendor_name}</span>
            </p>
            <div className="bg-gray-50 rounded-xl p-3 mb-4 text-center">
              <p className="text-2xl font-bold text-navy">
                ₹{parseFloat(confirm.total_price).toLocaleString('en-IN')}
              </p>
              <p className="text-xs text-gray-500">Delivery in {confirm.delivery_days} days</p>
            </div>
            <p className="text-xs text-gray-400 text-center mb-5">
              All other quotations will be marked as rejected.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirm(null)} disabled={selecting} className="btn-secondary flex-1">
                Cancel
              </button>
              <button
                onClick={handleSelect}
                disabled={selecting}
                className="flex-1 bg-green-500 text-white px-4 py-2 rounded-lg font-medium hover:bg-green-600 transition-colors"
              >
                {selecting
                  ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto block" />
                  : 'Confirm'
                }
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}