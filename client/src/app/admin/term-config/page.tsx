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
    termName: '', year: 1, registrationOpensAt: '', registrationClosesAt: ''
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
        termName: config.termName,
        year: config.year,
        registrationOpensAt: new Date(config.registrationOpensAt).toISOString().slice(0, 16),
        registrationClosesAt: new Date(config.registrationClosesAt).toISOString().slice(0, 16)
      })
    } else {
      setEditingId(null)
      setFormData({ termName: '', year: 1, registrationOpensAt: '', registrationClosesAt: '' })
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
    { header: 'Term Name', accessor: 'termName' },
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
          <Input label="Term Name" value={formData.termName} onChange={e => setFormData({...formData, termName: e.target.value})} required placeholder="e.g. 2024-Fall" />
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
