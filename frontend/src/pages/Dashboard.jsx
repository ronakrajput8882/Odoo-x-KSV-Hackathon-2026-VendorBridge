import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import api from '../api/axios'
import {
  Users, FileText, CheckSquare, ShoppingBag,
  FileCheck, Plus, ArrowRight, TrendingUp
} from 'lucide-react'

const STATUS_BADGE = {
  open:      'badge-blue',
  closed:    'badge-gray',
  awarded:   'badge-green',
  issued:    'badge-blue',
  delivered: 'badge-green',
  cancelled: 'badge-red',
  pending:   'badge-yellow',
  approved:  'badge-green',
  rejected:  'badge-red',
}

export default function Dashboard() {
  const [stats,     setStats]     = useState(null)
  const [recentPOs, setRecentPOs] = useState([])
  const [recentRFQs,setRecentRFQs]= useState([])
  const [loading,   setLoading]   = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    Promise.all([
      api.get('/dashboard/stats'),
      api.get('/dashboard/recent-pos'),
      api.get('/dashboard/recent-rfqs'),
    ]).then(([s, p, r]) => {
      setStats(s.data)
      setRecentPOs(p.data)
      setRecentRFQs(r.data)
    }).finally(() => setLoading(false))
  }, [])

  const STAT_CARDS = stats ? [
    { label: 'Total Vendors',      value: stats.total_vendors,     icon: Users,       color: 'bg-blue-50 text-blue-600',   link: '/vendors' },
    { label: 'Active RFQs',        value: stats.active_rfqs,       icon: FileText,    color: 'bg-purple-50 text-purple-600', link: '/rfq' },
    { label: 'Pending Approvals',  value: stats.pending_approvals, icon: CheckSquare, color: 'bg-yellow-50 text-yellow-600', link: '/approvals' },
    { label: 'Purchase Orders',    value: stats.total_pos,         icon: ShoppingBag, color: 'bg-green-50 text-green-600',  link: '/orders' },
    { label: 'Invoices Generated', value: stats.total_invoices,    icon: FileCheck,   color: 'bg-pink-50 text-pink-600',   link: '/orders' },
  ] : []

  const QUICK_ACTIONS = [
    { label: 'New RFQ',    icon: FileText,    link: '/rfq',     color: 'bg-accent text-white hover:bg-blue-700' },
    { label: 'Add Vendor', icon: Users,       link: '/vendors', color: 'bg-navy text-white hover:bg-slate-800' },
    { label: 'Approvals',  icon: CheckSquare, link: '/approvals', color: 'bg-yellow-500 text-white hover:bg-yellow-600' },
  ]

  if (loading) return (
    <Layout>
      <div className="flex items-center justify-center h-64">
        <span className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    </Layout>
  )

  return (
    <Layout>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-navy">Dashboard</h1>
          <p className="text-gray-500 text-sm mt-0.5">Procurement overview at a glance</p>
        </div>
        <div className="flex gap-2">
          {QUICK_ACTIONS.map(({ label, icon: Icon, link, color }) => (
            <button
              key={label}
              onClick={() => navigate(link)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${color}`}
            >
              <Icon className="w-4 h-4" /> {label}
            </button>
          ))}
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        {STAT_CARDS.map(({ label, value, icon: Icon, color, link }) => (
          <button
            key={label}
            onClick={() => navigate(link)}
            className="card text-left hover:shadow-md transition-shadow group"
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${color}`}>
              <Icon className="w-5 h-5" />
            </div>
            <p className="text-2xl font-bold text-navy">{value}</p>
            <p className="text-xs text-gray-500 mt-0.5 group-hover:text-accent transition-colors">{label}</p>
          </button>
        ))}
      </div>

      {/* Tables row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Recent RFQs */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-navy flex items-center gap-2">
              <FileText className="w-4 h-4 text-accent" /> Recent RFQs
            </h2>
            <button onClick={() => navigate('/rfq')} className="text-accent text-xs hover:underline flex items-center gap-1">
              View all <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          {recentRFQs.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="w-8 h-8 text-gray-200 mx-auto mb-2" />
              <p className="text-gray-400 text-sm">No RFQs yet</p>
              <button onClick={() => navigate('/rfq')} className="btn-primary mt-3 text-xs px-3 py-1.5">
                <Plus className="w-3 h-3 inline mr-1" /> Create RFQ
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {recentRFQs.map(r => (
                <div key={r.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-navy">{r.title}</p>
                    <p className="text-xs text-gray-400">{r.rfq_number} · {r.quotes} quote{r.quotes !== 1 ? 's' : ''}</p>
                  </div>
                  <span className={STATUS_BADGE[r.status] || 'badge-gray'}>{r.status}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent POs */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-navy flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 text-accent" /> Recent Purchase Orders
            </h2>
            <button onClick={() => navigate('/orders')} className="text-accent text-xs hover:underline flex items-center gap-1">
              View all <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          {recentPOs.length === 0 ? (
            <div className="text-center py-8">
              <ShoppingBag className="w-8 h-8 text-gray-200 mx-auto mb-2" />
              <p className="text-gray-400 text-sm">No purchase orders yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {recentPOs.map(p => (
                <div key={p.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-navy">{p.po_number}</p>
                    <p className="text-xs text-gray-400">{p.vendor} · ₹{p.total?.toLocaleString()}</p>
                  </div>
                  <span className={STATUS_BADGE[p.status] || 'badge-gray'}>{p.status}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  )
}