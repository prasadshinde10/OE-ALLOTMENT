'use client'
import { useState, useEffect } from 'react'
import api from '@/lib/api'
import { DataTable } from '@/components/ui/DataTable'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import toast from 'react-hot-toast'

const APPROVED_DEPARTMENTS = [
  'Computer Science and Engineering',
  'Computer Science and Design',
  'Artificial Intelligence and Data Science',
  'Mechanical Engineering',
  'Civil Engineering',
  'Electronics and Telecommunication',
]

export default function AdminBranchesPage() {
  const [branches, setBranches] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [filterYear, setFilterYear] = useState('')
  const [formData, setFormData] = useState({ name: '', year: '1' })

  useEffect(() => {
    fetchBranches()
  }, [filterYear])

  const fetchBranches = async () => {
    try {
      setLoading(true)
      const res = await api.get(`/api/admin/branches${filterYear ? `?year=${filterYear}` : ''}`)
      setBranches(res.data.data)
    } catch (err) {
      toast.error('Failed to load branches')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await api.post('/api/admin/branches', { name: formData.name, year: Number(formData.year) })
      toast.success('Branch created')
      setIsModalOpen(false)
      setFormData({ name: '', year: '1' })
      fetchBranches()
    } catch (err: any) {
      if (err.response?.status === 409) {
        toast.error('Branch already exists for this year')
      } else {
        toast.error(err.response?.data?.message || 'Error creating branch')
      }
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this branch?')) return
    try {
      await api.delete(`/api/admin/branches/${id}`)
      toast.success('Branch deleted')
      fetchBranches()
    } catch (err) {
      toast.error('Error deleting branch')
    }
  }

  const columns = [
    { header: 'Name', accessor: 'name' },
    { header: 'Year', accessor: 'year' },
    { 
      header: 'Actions', 
      accessor: (row: any) => (
        <Button size="sm" variant="danger" onClick={() => handleDelete(row._id)}>Delete</Button>
      ) 
    }
  ]

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Manage Branches</h1>
        <Button onClick={() => setIsModalOpen(true)}>Add Branch</Button>
      </div>

      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <div className="mb-4 flex gap-4 items-center">
          <label className="text-sm font-medium text-gray-700">Filter by Year:</label>
          <select 
            value={filterYear} 
            onChange={(e) => setFilterYear(e.target.value)}
            className="border-gray-300 rounded-md shadow-sm border px-3 py-1.5"
          >
            <option value="">All Years</option>
            <option value="1">1st Year</option>
            <option value="2">2nd Year</option>
            <option value="3">3rd Year</option>
          </select>
        </div>
        <DataTable columns={columns} data={branches} />
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Add Branch">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Department / Branch Name</label>
            <select
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              required
            >
              <option value="">— Select Department —</option>
              {APPROVED_DEPARTMENTS.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Year</label>
            <select 
              value={formData.year} 
              onChange={e => setFormData({...formData, year: e.target.value})} 
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md border" 
              required
            >
              <option value="1">1st Year</option>
              <option value="2">2nd Year</option>
              <option value="3">3rd Year</option>
            </select>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button type="submit">Create</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
