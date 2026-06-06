import { useEffect, useState } from 'react'
import Layout from '../components/Layout'
import api from '../api/axios'
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, Legend
} from 'recharts'
import { TrendingUp } from 'lucide-react'

const COLORS = ['#2563eb','#10b981','#f59e0b','#ef4444','#8b5cf6','#06b6d4']

export default function Reports() {
  const [stats, setStats] = useState(null)

  useEffect(() => {
    api.get('/dashboard/stats').then(r => setStats(r.data)).catch(() => {})
  }, [])

  // Mock trend data (replace with real endpoint if time allows)
  const monthly = [
    { month: 'Jan', rfqs: 4,  pos: 2, spend: 120000 },
    { month: 'Feb', rfqs: 6,  pos: 4, spend: 240000 },
    { month: 'Mar', rfqs: 5,  pos: 3, spend: 180000 },
    { month: 'Apr', rfqs: 8,  pos: 6, spend: 320000 },
    { month: 'May', rfqs: 10, pos: 7, spend: 410000 },
    { month: 'Jun', rfqs: 7,  pos: 5, spend: 290000 },
  ]

  const statusData = stats ? [
    { name: 'Vendors',   value: stats.total_vendors     },
    { name: 'Active RFQs', value: stats.active_rfqs     },
    { name: 'Pending',   value: stats.pending_approvals },
    { name: 'POs',       value: stats.total_pos         },
    { name: 'Invoices',  value: stats.total_invoices    },
  ] : []

  const Card = ({ title, children }) => (
    <div className="card">
      <h2 className="font-semibold text-navy mb-4 flex items-center gap-2">
        <TrendingUp className="w-4 h-4 text-accent" /> {title}
      </h2>
      {children}
    </div>
  )

  return (
    <Layout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-navy">Reports & Analytics</h1>
        <p className="text-gray-500 text-sm mt-0.5">Procurement overview and trends</p>
      </div>

      {/* KPI Cards */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          {statusData.map(({ name, value }) => (
            <div key={name} className="card text-center py-5">
              <p className="text-3xl font-bold text-navy">{value}</p>
              <p className="text-xs text-gray-500 mt-1">{name}</p>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
        {/* RFQs vs POs Bar */}
        <Card title="RFQs vs Purchase Orders">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={monthly} barCategoryGap="30%">
              <XAxis dataKey="month" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip />
              <Legend iconType="circle" iconSize={8} />
              <Bar dataKey="rfqs" name="RFQs" fill="#2563eb" radius={[4,4,0,0]} />
              <Bar dataKey="pos"  name="POs"  fill="#10b981" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Spending Trend Line */}
        <Card title="Monthly Spend (₹)">
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={monthly}>
              <XAxis dataKey="month" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false}
                tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} />
              <Tooltip formatter={v => `₹${v.toLocaleString('en-IN')}`} />
              <Line
                type="monotone" dataKey="spend" name="Spend"
                stroke="#2563eb" strokeWidth={2.5}
                dot={{ fill: '#2563eb', r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Pie */}
      <Card title="Procurement Distribution">
        <div className="flex items-center justify-center">
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie
                data={statusData.filter(d => d.value > 0)}
                cx="50%" cy="50%"
                innerRadius={60} outerRadius={100}
                paddingAngle={3} dataKey="value"
              >
                {statusData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend iconType="circle" iconSize={8} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </Layout>
  )
}