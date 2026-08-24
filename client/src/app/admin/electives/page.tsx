'use client'
import { useState, useEffect } from 'react'
import api from '@/lib/api'
import { DataTable } from '@/components/ui/DataTable'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import toast from 'react-hot-toast'
import { Elective } from '@/types'
import { exportToCSV } from '@/lib/csvExport'

export default function AdminElectivesPage() {
  const [electives, setElectives] = useState<Elective[]>([])
  const [branches, setBranches] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    offeredByDepartment: '',
    year: 1,
    term: 'Sem-1',
    capacity: 60,
  })

  useEffect(() => {
    fetchElectives()
    fetchBranches()
  }, [])

  const fetchElectives = async () => {
    try {
      setLoading(true)
      const res = await api.get('/api/electives')
      setElectives(res.data.data || [])
    } catch (err) {
      toast.error('Failed to load electives')
    } finally {
      setLoading(false)
    }
  }

  const fetchBranches = async () => {
    try {
      const res = await api.get('/api/admin/branches')
      setBranches(res.data.data || [])
    } catch (err) {
      console.error('Failed to load branches', err)
    }
  }

  const handleOpenModal = (elective?: Elective) => {
    if (elective) {
      setEditingId(elective._id)
      setFormData({
        name: elective.name,
        code: elective.code,
        offeredByDepartment: elective.offeredByDepartment || '',
        year: elective.year,
        term: elective.term,
        capacity: elective.capacity,
      })
    } else {
      setEditingId(null)
      setFormData({
        name: '',
        code: '',
        offeredByDepartment: '',
        year: 1,
        term: 'Sem-1',
        capacity: 60,
      })
    }
    setIsModalOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (editingId) {
        await api.put(`/api/electives/${editingId}`, formData)
        toast.success('Elective updated successfully')
      } else {
        await api.post('/api/electives', formData)
        toast.success('Elective created successfully')
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

  const handleExportCSV = () => {
    if (electives.length === 0) {
      toast.error('No elective records to export')
      return
    }
    try {
      exportToCSV(electives, {
        filename: 'electives-report',
        columns: [
          { header: 'Code', key: 'code' },
          { header: 'Name', key: 'name' },
          { header: 'Offered By Department', key: 'offeredByDepartment', transform: (v) => v || '-' },
          { header: 'Year', key: 'year' },
          { header: 'Semester', key: 'term' },
          { header: 'Capacity', key: 'capacity' },
          { header: 'Seats Filled', key: 'seatsFilled' },
          { header: 'Available', key: 'capacity', transform: (_v, row) => String(row.capacity - (row.seatsFilled || 0)) },
          { header: 'Active', key: 'isActive', transform: (v) => (v ? 'Yes' : 'No') },
        ],
      })
      toast.success(`Exported ${electives.length} elective records`)
    } catch (err) {
      toast.error('Failed to export CSV')
    }
  }

  const columns = [
    { header: 'Code', accessor: 'code' },
    { header: 'Name', accessor: 'name' },
    { header: 'Offered By Department', accessor: (row: Elective) => row.offeredByDepartment || '-' },
    { header: 'Year', accessor: (row: Elective) => `Year ${row.year}` },
    { header: 'Semester', accessor: 'term' },
    { header: 'Capacity', accessor: 'capacity' },
    { header: 'Filled', accessor: 'seatsFilled' },
    {
      header: 'Actions',
      accessor: (row: Elective) => (
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => handleOpenModal(row)}>Edit</Button>
          <Button size="sm" variant="danger" onClick={() => handleDelete(row._id)}>Delete</Button>
        </div>
      ),
    },
  ]

  // Extract unique branch names for quick department suggestions
  const departmentOptions = Array.from(new Set(branches.map(b => b.name)))

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Manage Electives</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExportCSV}>
            📥 Export to CSV
          </Button>
          <Button onClick={() => handleOpenModal()}>Add Elective</Button>
        </div>
      </div>

      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <DataTable columns={columns} data={electives} />
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingId ? 'Edit Elective' : 'Add Elective'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Course / Open Elective Name"
            value={formData.name}
            onChange={e => setFormData({ ...formData, name: e.target.value })}
            required
            placeholder="e.g. Artificial Intelligence Basics"
          />
          <Input
            label="Code"
            value={formData.code}
            onChange={e => setFormData({ ...formData, code: e.target.value })}
            required
            placeholder="e.g. OE-CS-301"
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Offered By Department</label>
            <div className="flex gap-2">
              <input
                type="text"
                list="department-suggestions"
                value={formData.offeredByDepartment}
                onChange={e => setFormData({ ...formData, offeredByDepartment: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="Enter or select offering department (e.g. CSE, IT, Mechanical)"
              />
              <datalist id="department-suggestions">
                {departmentOptions.map(dept => (
                  <option key={dept} value={dept} />
                ))}
              </datalist>
            </div>
            <p className="text-xs text-gray-500 mt-1">Select from existing branches or type the department name.</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
            <select
              value={formData.year}
              onChange={e => setFormData({ ...formData, year: Number(e.target.value) })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              required
            >
              <option value={1}>1st Year</option>
              <option value={2}>2nd Year</option>
              <option value={3}>3rd Year</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Semester</label>
            <select
              value={formData.term}
              onChange={e => setFormData({ ...formData, term: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              required
            >
              {Array.from({ length: 8 }, (_, i) => (
                <option key={`sem-${i + 1}`} value={`Sem-${i + 1}`}>
                  Sem-{i + 1}
                </option>
              ))}
            </select>
          </div>

          <Input
            label="Total Seats / Capacity"
            type="number"
            value={formData.capacity}
            onChange={e => setFormData({ ...formData, capacity: Number(e.target.value) })}
            required
            min={1}
          />

          <div className="flex justify-end gap-2 mt-4">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Save</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
