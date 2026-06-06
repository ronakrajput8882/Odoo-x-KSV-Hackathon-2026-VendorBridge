import { useEffect, useState } from 'react'
import Layout from '../components/Layout'
import api from '../api/axios'
import toast from 'react-hot-toast'
import {
  Plus, Search, Filter, Edit2, Trash2,
  ToggleLeft, ToggleRight, X, Star, Building
} from 'lucide-react'

const EMPTY = {
  name: '', category: '', gst_number: '',
  contact_name: '', contact_email: '',
  contact_phone: '', address: ''
}

const CATEGORIES = ['IT', 'Hardware', 'Software', 'Logistics', 'Office Supplies', 'Consulting', 'Other']

export default function Vendors() {
  const [vendors,   setVendors]   = useState([])
  const [loading,   setLoading]   = useState(true)
  const [search,    setSearch]    = useState('')
  const [statusF,   setStatusF]   = useState('')
  const [modal,     setModal]     = useState(false)
  const [editing,   setEditing]   = useState(null)   // null = new
  const [form,      setForm]      = useState(EMPTY)
  const [saving,    setSaving]    = useState(false)
  const [deleteId,  setDeleteId]  = useState(null)

  const fetchVendors = async () => {
    setLoading(true)
    try {
      const params = {}
      if (search)  params.search = search
      if (statusF) params.status = statusF
      const { data } = await api.get('/vendors', { params })
      setVendors(data)
    } catch { toast.error('Failed to load vendors') }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchVendors() }, [search, statusF])

  const openNew = () => { setEditing(null); setForm(EMPTY); setModal(true) }
  const openEdit = (v) => {
    setEditing(v.id)
    setForm({
      name: v.name || '', category: v.category || '',
      gst_number: v.gst_number || '', contact_name: v.contact_name || '',
      contact_email: v.contact_email || '', contact_phone: v.contact_phone || '',
      address: v.address || ''
    })
    setModal(true)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      if (editing) {
        await api.put(`/vendors/${editing}`, form)
        toast.success('Vendor updated')
      } else {
        await api.post('/vendors', form)
        toast.success('Vendor added')
      }
      setModal(false)
      fetchVendors()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Save failed')
    } finally { setSaving(false) }
  }

  const handleToggle = async (id) => {
    try {
      await api.patch(`/vendors/${id}/toggle-status`)
      fetchVendors()
    } catch { toast.error('Failed to toggle status') }
  }

  const handleDelete = async () => {
    try {
      await api.delete(`/vendors/${deleteId}`)
      toast.success('Vendor deleted')
      setDeleteId(null)
      fetchVendors()
    } catch { toast.error('Delete failed') }
  }

  const field = (label, key, type = 'text', opts = {}) => (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      {opts.select ? (
        <select
          value={form[key]}
          onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
          className="input-field"
        >
          <option value="">Select category</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      ) : opts.textarea ? (
        <textarea
          value={form[key]}
          onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
          rows={2}
          className="input-field resize-none"
          placeholder={opts.placeholder || ''}
        />
      ) : (
        <input
          type={type}
          value={form[key]}
          onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
          className="input-field"
          placeholder={opts.placeholder || ''}
          required={opts.required}
        />
      )}
    </div>
  )

  return (
    <Layout>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-navy">Vendors</h1>
          <p className="text-gray-500 text-sm mt-0.5">{vendors.length} vendor{vendors.length !== 1 ? 's' : ''} registered</p>
        </div>
        <button onClick={openNew} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Add Vendor
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search name, email, GST..."
            className="input-field pl-9"
          />
        </div>
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <select
            value={statusF}
            onChange={e => setStatusF(e.target.value)}
            className="input-field pl-9 pr-8 w-36"
          >
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <span className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          </div>
        ) : vendors.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 gap-3">
            <Building className="w-10 h-10 text-gray-200" />
            <p className="text-gray-400 text-sm">No vendors found</p>
            <button onClick={openNew} className="btn-primary text-sm px-3 py-1.5">
              <Plus className="w-3 h-3 inline mr-1" /> Add First Vendor
            </button>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {['Vendor', 'Category', 'GST Number', 'Contact', 'Rating', 'Status', 'Actions'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {vendors.map(v => (
                <tr key={v.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-accent/10 rounded-lg flex items-center justify-center flex-shrink-0">
                        <span className="text-accent text-xs font-bold">{v.name[0]}</span>
                      </div>
                      <div>
                        <p className="font-medium text-navy">{v.name}</p>
                        <p className="text-xs text-gray-400">{v.contact_email || '—'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{v.category || '—'}</td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">{v.gst_number || '—'}</td>
                  <td className="px-4 py-3">
                    <p className="text-gray-700">{v.contact_name || '—'}</p>
                    <p className="text-xs text-gray-400">{v.contact_phone || ''}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-1 text-yellow-500 font-medium text-xs">
                      <Star className="w-3 h-3 fill-yellow-400" /> {v.rating}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={v.status === 'active' ? 'badge-green' : 'badge-gray'}>
                      {v.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEdit(v)}
                        className="p-1.5 text-gray-400 hover:text-accent hover:bg-blue-50 rounded-lg transition-colors"
                        title="Edit"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleToggle(v.id)}
                        className="p-1.5 text-gray-400 hover:text-yellow-500 hover:bg-yellow-50 rounded-lg transition-colors"
                        title={v.status === 'active' ? 'Deactivate' : 'Activate'}
                      >
                        {v.status === 'active'
                          ? <ToggleRight className="w-3.5 h-3.5 text-green-500" />
                          : <ToggleLeft className="w-3.5 h-3.5" />}
                      </button>
                      <button
                        onClick={() => setDeleteId(v.id)}
                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Add/Edit Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-navy">{editing ? 'Edit Vendor' : 'Add New Vendor'}</h2>
              <button onClick={() => setModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-3 max-h-[70vh] overflow-y-auto">
              {field('Vendor Name *', 'name', 'text', { required: true, placeholder: 'Acme Corp' })}
              {field('Category', 'category', 'text', { select: true })}
              {field('GST Number', 'gst_number', 'text', { placeholder: '27AAPFU0939F1ZV' })}
              <div className="grid grid-cols-2 gap-3">
                {field('Contact Person', 'contact_name', 'text', { placeholder: 'John Doe' })}
                {field('Phone', 'contact_phone', 'tel', { placeholder: '+91 9876543210' })}
              </div>
              {field('Contact Email', 'contact_email', 'email', { placeholder: 'vendor@company.com' })}
              {field('Address', 'address', 'text', { textarea: true, placeholder: 'Street, City, State' })}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setModal(false)} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" disabled={saving} className="btn-primary flex-1">
                  {saving ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto block" /> : editing ? 'Save Changes' : 'Add Vendor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl p-6 text-center">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-6 h-6 text-red-500" />
            </div>
            <h3 className="font-semibold text-navy mb-1">Delete Vendor?</h3>
            <p className="text-gray-500 text-sm mb-5">This action cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteId(null)} className="btn-secondary flex-1">Cancel</button>
              <button onClick={handleDelete} className="flex-1 bg-red-500 text-white px-4 py-2 rounded-lg font-medium hover:bg-red-600 transition-colors">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}