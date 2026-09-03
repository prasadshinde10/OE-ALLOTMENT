'use client'

import { useState, useEffect } from 'react'
import api from '@/lib/api'
import { DataTable } from '@/components/ui/DataTable'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import toast from 'react-hot-toast'

const APPROVED_DEPARTMENTS = [
  'Computer Science and Engineering',
  'Computer Science and Design',
  'Artificial Intelligence and Data Science',
  'Mechanical Engineering',
  'Civil Engineering',
  'Electronics and Telecommunication',
]

export default function FYAdminBranchesPage() {
  const [branches, setBranches] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [name, setName] = useState('')

  useEffect(() => {
    fetchBranches()
  }, [])

  const fetchBranches = async () => {
    try {
      setLoading(true)
      const res = await api.get('/api/fy-admin/branches')
      setBranches(res.data.data || [])
    } catch (err) {
      toast.error('Failed to load FY branches')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await api.post('/api/fy-admin/branches', { name })
      toast.success('First-Year branch registered')
      setIsModalOpen(false)
      setName('')
      fetchBranches()
    } catch (err: any) {
      if (err.response?.status === 409) {
        toast.error('Branch already registered for First-Year')
      } else {
        toast.error(err.response?.data?.message || 'Error creating branch')
      }
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to remove this branch from First-Year?')) return
    try {
      await api.delete(`/api/fy-admin/branches/${id}`)
      toast.success('Branch deleted')
      fetchBranches()
    } catch (err) {
      toast.error('Error deleting branch')
    }
  }

  const columns = [
    { header: 'Department / Branch Name', accessor: 'name' },
    {
      header: 'Academic Year Scope',
      accessor: () => <span className="text-xs font-semibold px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded">1st Year (FY)</span>,
    },
    {
      header: 'Actions',
      accessor: (row: any) => (
        <Button size="sm" variant="danger" onClick={() => handleDelete(row._id)}>
          Delete
        </Button>
      ),
    },
  ]

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Manage First-Year Branches</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Configure participating academic departments for First-Year club allotment
          </p>
        </div>
        <Button onClick={() => setIsModalOpen(true)}>+ Add Department</Button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <DataTable columns={columns} data={branches} isLoading={loading} />
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Add First-Year Department">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Select Department / Branch Name
            </label>
            <select
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
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

          <div className="flex justify-end gap-2 mt-4">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Add Department</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
