'use client'
import { useState, useEffect } from 'react'
import api from '@/lib/api'
import { DataTable } from '@/components/ui/DataTable'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import toast from 'react-hot-toast'
import { TermConfig } from '@/types'

export default function AdminTermConfigPage() {
  const [configs, setConfigs] = useState<TermConfig[]>([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    term: 'Sem-1', year: 1, registrationOpensAt: '', registrationClosesAt: ''
  })

  useEffect(() => {
    fetchConfigs()
  }, [])

  const fetchConfigs = async () => {
    try {
      const res = await api.get('/api/admin/term-configs')
      setConfigs(res.data.data)
    } catch (err) {
      toast.error('Failed to load term configs')
    }
  }

  const handleOpenModal = (config?: TermConfig) => {
    if (config) {
      setEditingId(config._id)
      setFormData({
        term: config.term,
        year: config.year,
        registrationOpensAt: new Date(config.registrationOpensAt).toISOString().slice(0, 16),
        registrationClosesAt: new Date(config.registrationClosesAt).toISOString().slice(0, 16)
      })
    } else {
      setEditingId(null)
      setFormData({ term: 'Sem-1', year: 1, registrationOpensAt: '', registrationClosesAt: '' })
    }
    setIsModalOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (editingId) {
        await api.put(`/api/admin/term-configs/${editingId}`, formData)
        toast.success('Config updated')
      } else {
        await api.post('/api/admin/term-configs', formData)
        toast.success('Config created')
      }
      setIsModalOpen(false)
      fetchConfigs()
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error saving config')
    }
  }

  const columns = [
    { header: 'Semester', accessor: 'term' },
    { header: 'Year', accessor: 'year' },
    { header: 'Opens At', accessor: (row: TermConfig) => new Date(row.registrationOpensAt).toLocaleString() },
    { header: 'Closes At', accessor: (row: TermConfig) => new Date(row.registrationClosesAt).toLocaleString() },
    { 
      header: 'Status', 
      accessor: (row: TermConfig) => {
        const now = new Date()
        const open = new Date(row.registrationOpensAt)
        const close = new Date(row.registrationClosesAt)
        if (now < open) return <span className="text-yellow-600 font-semibold">Upcoming</span>
        if (now > close) return <span className="text-red-600 font-semibold">Closed</span>
        return <span className="text-green-600 font-semibold">Open</span>
      } 
    },
    { 
      header: 'Actions', 
      accessor: (row: TermConfig) => (
        <Button size="sm" variant="outline" onClick={() => handleOpenModal(row)}>Edit</Button>
      ) 
    }
  ]

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Term Configurations</h1>
        <Button onClick={() => handleOpenModal()}>Add Term</Button>
      </div>

      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <DataTable columns={columns} data={configs} />
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingId ? 'Edit Term Config' : 'Add Term Config'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Semester</label>
            <select 
              value={formData.term} 
              onChange={e => setFormData({...formData, term: e.target.value})} 
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md border" 
              required
            >
              {Array.from({ length: 8 }, (_, i) => (
                <option key={`sem-${i+1}`} value={`Sem-${i+1}`}>Sem-{i+1}</option>
              ))}
            </select>
          </div>
          <Input label="Year" type="number" value={formData.year} onChange={e => setFormData({...formData, year: Number(e.target.value)})} required min={1} max={4} />
          <Input label="Registration Opens At" type="datetime-local" value={formData.registrationOpensAt} onChange={e => setFormData({...formData, registrationOpensAt: e.target.value})} required />
          <Input label="Registration Closes At" type="datetime-local" value={formData.registrationClosesAt} onChange={e => setFormData({...formData, registrationClosesAt: e.target.value})} required />
          <div className="flex justify-end gap-2 mt-4">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button type="submit">Save</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
