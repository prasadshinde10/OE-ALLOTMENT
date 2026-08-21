'use client'
import { useState, useEffect } from 'react'
import api from '@/lib/api'
import { DataTable } from '@/components/ui/DataTable'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import toast from 'react-hot-toast'
import { Elective } from '@/types'

export default function AdminElectivesPage() {
  const [electives, setElectives] = useState<Elective[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState({ name: '', code: '', year: 1, term: '', capacity: 60 })

  useEffect(() => {
    fetchElectives()
  }, [])

  const fetchElectives = async () => {
    try {
      setLoading(true)
      const res = await api.get('/api/electives')
      setElectives(res.data.data)
    } catch (err) {
      toast.error('Failed to load electives')
    } finally {
      setLoading(false)
    }
  }

  const handleOpenModal = (elective?: Elective) => {
    if (elective) {
      setEditingId(elective._id)
      setFormData({ name: elective.name, code: elective.code, year: elective.year, term: elective.term, capacity: elective.capacity })
    } else {
      setEditingId(null)
      setFormData({ name: '', code: '', year: 1, term: '', capacity: 60 })
    }
    setIsModalOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (editingId) {
        await api.put(`/api/electives/${editingId}`, formData)
        toast.success('Elective updated')
      } else {
        await api.post('/api/electives', formData)
        toast.success('Elective created')
      }
      setIsModalOpen(false)
      fetchElectives()
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error saving elective')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this elective?')) return
    try {
      await api.delete(`/api/electives/${id}`)
      toast.success('Elective deleted')
      fetchElectives()
    } catch (err) {
      toast.error('Error deleting elective')
    }
  }

  const columns = [
    { header: 'Code', accessor: 'code' },
    { header: 'Name', accessor: 'name' },
    { header: 'Year', accessor: 'year' },
    { header: 'Term', accessor: 'term' },
    { header: 'Capacity', accessor: 'capacity' },
    { header: 'Filled', accessor: 'seatsFilled' },
    { 
      header: 'Actions', 
      accessor: (row: Elective) => (
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => handleOpenModal(row)}>Edit</Button>
          <Button size="sm" variant="danger" onClick={() => handleDelete(row._id)}>Delete</Button>
        </div>
      ) 
    }
  ]

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Manage Electives</h1>
        <Button onClick={() => handleOpenModal()}>Add Elective</Button>
      </div>

      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <DataTable columns={columns} data={electives} />
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingId ? 'Edit Elective' : 'Add Elective'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="Name" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required />
          <Input label="Code" value={formData.code} onChange={e => setFormData({...formData, code: e.target.value})} required />
          <Input label="Year" type="number" value={formData.year} onChange={e => setFormData({...formData, year: Number(e.target.value)})} required min={1} max={4} />
          <Input label="Term" value={formData.term} onChange={e => setFormData({...formData, term: e.target.value})} required placeholder="e.g. 2024-Fall" />
          <Input label="Capacity" type="number" value={formData.capacity} onChange={e => setFormData({...formData, capacity: Number(e.target.value)})} required min={1} />
          <div className="flex justify-end gap-2 mt-4">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button type="submit">Save</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
