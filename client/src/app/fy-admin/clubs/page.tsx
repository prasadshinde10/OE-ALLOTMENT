'use client'

import { useState, useEffect } from 'react'
import api from '@/lib/api'
import { DataTable } from '@/components/ui/DataTable'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import toast from 'react-hot-toast'
import { Club, ClubDivision } from '@/types'
import { exportToCSV } from '@/lib/csvExport'

const emptyDivision = (): ClubDivision => ({
  divisionName: '',
  coordinatorName: '',
  hallRoom: '',
  coordinatorContact: '',
  capacity: 30,
})

const APPROVED_DEPARTMENTS = [
  'Computer Science and Engineering',
  'Computer Science and Design',
  'Artificial Intelligence and Data Science',
  'Mechanical Engineering',
  'Civil Engineering',
  'Electronics and Telecommunication',
]

export default function FYAdminClubsPage() {
  const [clubs, setClubs] = useState<Club[]>([])
  const [branches, setBranches] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'co-curricular' | 'extra-curricular'>('all')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [assigning, setAssigning] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    name: '',
    code: '',
    category: 'co-curricular' as 'co-curricular' | 'extra-curricular',
    offeredByDepartment: '',
    term: 'Sem-1',
    capacity: 60,
    syllabusUrl: '',
    coordinatorName: '',
    coordinatorContact: '',
    description: '',
  })
  const [divisions, setDivisions] = useState<ClubDivision[]>([])

  useEffect(() => {
    fetchClubs()
    fetchBranches()
  }, [])

  const fetchClubs = async () => {
    try {
      setLoading(true)
      const res = await api.get('/api/clubs?year=1')
      setClubs(res.data.data || [])
    } catch (err) {
      toast.error('Failed to load clubs')
    } finally {
      setLoading(false)
    }
  }

  const fetchBranches = async () => {
    try {
      const res = await api.get('/api/fy-admin/branches')
      setBranches(res.data.data || [])
    } catch (err) {
      setBranches([])
    }
  }

  const handleOpenModal = (club?: Club) => {
    if (club) {
      setEditingId(club._id)
      setFormData({
        name: club.name,
        code: club.code,
        category: club.category,
        offeredByDepartment: club.offeredByDepartment || '',
        term: club.term,
        capacity: club.capacity,
        syllabusUrl: club.syllabusUrl || '',
        coordinatorName: club.coordinatorName || '',
        coordinatorContact: club.coordinatorContact || '',
        description: club.description || '',
      })
      setDivisions(
        club.divisions && club.divisions.length > 0
          ? club.divisions.map((d) => ({
              divisionName: d.divisionName,
              coordinatorName: d.coordinatorName || d.facultyName || '',
              hallRoom: d.hallRoom || '',
              coordinatorContact: d.coordinatorContact || d.facultyContact || '',
              capacity: d.capacity,
            }))
          : [emptyDivision()]
      )
    } else {
      setEditingId(null)
      setFormData({
        name: '',
        code: '',
        category: categoryFilter === 'all' ? 'co-curricular' : categoryFilter,
        offeredByDepartment: '',
        term: 'Sem-1',
        capacity: 60,
        syllabusUrl: '',
        coordinatorName: '',
        coordinatorContact: '',
        description: '',
      })
      setDivisions([
        { divisionName: 'Div-A', coordinatorName: '', hallRoom: '', coordinatorContact: '', capacity: 30 },
        { divisionName: 'Div-B', coordinatorName: '', hallRoom: '', coordinatorContact: '', capacity: 30 },
      ])
    }
    setIsModalOpen(true)
  }

  const handleAddDivision = () => {
    const nextChar = String.fromCharCode(65 + divisions.length)
    setDivisions([
      ...divisions,
      { divisionName: `Div-${nextChar}`, coordinatorName: '', hallRoom: '', coordinatorContact: '', capacity: 30 },
    ])
  }

  const handleRemoveDivision = (idx: number) => {
    setDivisions(divisions.filter((_, i) => i !== idx))
  }

  const handleDivisionChange = (index: number, field: keyof ClubDivision, value: any) => {
    const updated = [...divisions]
    updated[index] = { ...updated[index], [field]: value }
    setDivisions(updated)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const divSum = divisions.reduce((acc, d) => acc + Number(d.capacity || 0), 0)
    if (divisions.length > 0 && divSum !== Number(formData.capacity)) {
      toast.error(`Division capacities sum (${divSum}) must equal total capacity (${formData.capacity})`)
      return
    }

    try {
      const payload = {
        ...formData,
        year: 1,
        divisions: divisions.map((d) => ({
          ...d,
          capacity: Number(d.capacity),
          facultyName: d.coordinatorName,
          facultyContact: d.coordinatorContact,
        })),
      }

      if (editingId) {
        await api.put(`/api/clubs/${editingId}`, payload)
        toast.success('Club updated successfully')
      } else {
        await api.post('/api/clubs', payload)
        toast.success('Club created successfully')
      }
      setIsModalOpen(false)
      fetchClubs()
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to save club')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to deactivate or delete this club?')) return
    try {
      await api.delete(`/api/clubs/${id}`)
      toast.success('Club updated')
      fetchClubs()
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to delete club')
    }
  }

  const handleAutoAssign = async (clubId: string) => {
    try {
      setAssigning(clubId)
      const res = await api.post(`/api/fy-admin/divisions/auto-assign/${clubId}`)
      toast.success(res.data.message || 'Divisions assigned successfully')
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to auto-assign divisions')
    } finally {
      setAssigning(null)
    }
  }

  const filteredClubs = clubs.filter((c) => {
    if (categoryFilter === 'all') return true
    return c.category === categoryFilter
  })

  const columns = [
    { header: 'Code', accessor: 'code' },
    {
      header: 'Club Name',
      accessor: (row: Club) => (
        <div>
          <div className="font-semibold text-gray-900">{row.name}</div>
          {row.offeredByDepartment && (
            <div className="text-xs text-gray-500">{row.offeredByDepartment}</div>
          )}
        </div>
      ),
    },
    {
      header: 'Category',
      accessor: (row: Club) => (
        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
            row.category === 'co-curricular'
              ? 'bg-indigo-100 text-indigo-800'
              : 'bg-purple-100 text-purple-800'
          }`}
        >
          {row.category === 'co-curricular' ? 'Co-Curricular' : 'Extra-Curricular'}
        </span>
      ),
    },
    {
      header: 'Capacity & Seats',
      accessor: (row: Club) => {
        const percent = Math.min(100, Math.round((row.seatsFilled / row.capacity) * 100))
        return (
          <div className="w-32">
            <div className="flex justify-between text-xs mb-1">
              <span>{row.seatsFilled} / {row.capacity}</span>
              <span className="font-semibold">{percent}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
              <div
                className={`h-1.5 rounded-full ${percent >= 100 ? 'bg-red-500' : percent >= 80 ? 'bg-amber-500' : 'bg-indigo-600'}`}
                style={{ width: `${percent}%` }}
              />
            </div>
          </div>
        )
      },
    },
    {
      header: 'Divisions',
      accessor: (row: Club) => (
        <span className="text-xs font-semibold px-2 py-1 bg-gray-100 rounded text-gray-700">
          {row.divisions?.length || 0} Divs
        </span>
      ),
    },
    {
      header: 'Status',
      accessor: (row: Club) => (
        <span className={`text-xs font-semibold ${row.isActive ? 'text-emerald-600' : 'text-red-500'}`}>
          {row.isActive ? '● Active' : '○ Inactive'}
        </span>
      ),
    },
    {
      header: 'Actions',
      accessor: (row: Club) => (
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => handleOpenModal(row)}>
            Edit
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => handleAutoAssign(row._id)}
            disabled={assigning === row._id}
          >
            {assigning === row._id ? 'Assigning...' : 'Auto Div'}
          </Button>
          <Button size="sm" variant="danger" onClick={() => handleDelete(row._id)}>
            Delete
          </Button>
        </div>
      ),
    },
  ]

  const handleExportClubs = () => {
    if (filteredClubs.length === 0) {
      toast.error('No clubs to export')
      return
    }
    exportToCSV(filteredClubs, {
      filename: `FY_Clubs_${categoryFilter}`,
      columns: [
        { header: 'Code', key: 'code' },
        { header: 'Name', key: 'name' },
        { header: 'Category', key: 'category' },
        { header: 'Department', key: 'offeredByDepartment' },
        { header: 'Term', key: 'term' },
        { header: 'Capacity', key: 'capacity' },
        { header: 'Seats Filled', key: 'seatsFilled' },
        { header: 'Remaining', key: 'remaining', transform: (_, row) => String(row.capacity - row.seatsFilled) },
        { header: 'Coordinator', key: 'coordinatorName' },
        { header: 'Contact', key: 'coordinatorContact' },
      ],
    })
    toast.success('Clubs exported')
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">First-Year Club Management</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Configure Co-Curricular and Extra-Curricular Clubs, capacities, and divisions
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={handleExportClubs}>
            Export CSV
          </Button>
          <Button onClick={() => handleOpenModal()}>
            + Add Club
          </Button>
        </div>
      </div>

      {/* Category Tabs Filter */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setCategoryFilter('all')}
          className={`py-3 px-4 text-sm font-medium border-b-2 transition-colors ${
            categoryFilter === 'all'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          All Clubs ({clubs.length})
        </button>
        <button
          onClick={() => setCategoryFilter('co-curricular')}
          className={`py-3 px-4 text-sm font-medium border-b-2 transition-colors ${
            categoryFilter === 'co-curricular'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          🎓 Co-Curricular Clubs ({clubs.filter((c) => c.category === 'co-curricular').length})
        </button>
        <button
          onClick={() => setCategoryFilter('extra-curricular')}
          className={`py-3 px-4 text-sm font-medium border-b-2 transition-colors ${
            categoryFilter === 'extra-curricular'
              ? 'border-purple-600 text-purple-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          🎨 Extra-Curricular Clubs ({clubs.filter((c) => c.category === 'extra-curricular').length})
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <DataTable columns={columns} data={filteredClubs} isLoading={loading} />
      </div>

      {/* Club Create/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingId ? 'Edit First-Year Club' : 'Create First-Year Club'}
      >
        <form onSubmit={handleSubmit} className="space-y-4 max-h-[75vh] overflow-y-auto pr-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Club Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              placeholder="e.g. Robotics & Automation Club"
            />
            <Input
              label="Club Code"
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value })}
              required
              placeholder="e.g. FY-ROBO-101"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
                required
              >
                <option value="co-curricular">🎓 Co-Curricular Club</option>
                <option value="extra-curricular">🎨 Extra-Curricular Club</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Semester / Term</label>
              <select
                value={formData.term}
                onChange={(e) => setFormData({ ...formData, term: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
                required
              >
                <option value="Sem-1">Sem-1 (1st Semester)</option>
                <option value="Sem-2">Sem-2 (2nd Semester)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Associated Department</label>
              <select
                value={formData.offeredByDepartment}
                onChange={(e) => setFormData({ ...formData, offeredByDepartment: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">General / Interdisciplinary</option>
                {(branches.length > 0 ? branches.map((b) => b.name) : APPROVED_DEPARTMENTS).map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>

            <Input
              label="Total Capacity"
              type="number"
              min={1}
              value={formData.capacity}
              onChange={(e) => setFormData({ ...formData, capacity: Number(e.target.value) })}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Primary Coordinator Name"
              value={formData.coordinatorName}
              onChange={(e) => setFormData({ ...formData, coordinatorName: e.target.value })}
              placeholder="e.g. Dr. A. Sharma"
            />
            <Input
              label="Coordinator Contact / Mobile"
              value={formData.coordinatorContact}
              onChange={(e) => setFormData({ ...formData, coordinatorContact: e.target.value })}
              placeholder="10-digit number"
            />
          </div>

          <Input
            label="Club Description / Syllabus URL"
            value={formData.syllabusUrl}
            onChange={(e) => setFormData({ ...formData, syllabusUrl: e.target.value })}
            placeholder="https://..."
          />

          {/* Divisions Section */}
          <div className="border-t pt-4 mt-4">
            <div className="flex justify-between items-center mb-3">
              <div>
                <h4 className="text-sm font-semibold text-gray-900">Club Divisions</h4>
                <p className="text-xs text-gray-500">
                  Total division capacity:{' '}
                  <span className="font-bold text-indigo-600">
                    {divisions.reduce((acc, d) => acc + Number(d.capacity || 0), 0)}
                  </span>{' '}
                  / {formData.capacity}
                </p>
              </div>
              <Button type="button" size="sm" variant="outline" onClick={handleAddDivision}>
                + Add Division
              </Button>
            </div>

            <div className="space-y-3">
              {divisions.map((div, index) => (
                <div key={index} className="p-3 bg-gray-50 border border-gray-200 rounded-lg space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-gray-700">Division #{index + 1}</span>
                    {divisions.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveDivision(index)}
                        className="text-xs text-red-600 hover:text-red-800"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <input
                      placeholder="Division Name (e.g. Div-A)"
                      value={div.divisionName}
                      onChange={(e) => handleDivisionChange(index, 'divisionName', e.target.value)}
                      className="border border-gray-300 rounded px-2 py-1 text-xs"
                      required
                    />
                    <input
                      placeholder="Faculty / Coordinator Name"
                      value={div.coordinatorName}
                      onChange={(e) => handleDivisionChange(index, 'coordinatorName', e.target.value)}
                      className="border border-gray-300 rounded px-2 py-1 text-xs"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <input
                      placeholder="Hall / Room No."
                      value={div.hallRoom}
                      onChange={(e) => handleDivisionChange(index, 'hallRoom', e.target.value)}
                      className="border border-gray-300 rounded px-2 py-1 text-xs"
                    />
                    <input
                      placeholder="Contact / Phone"
                      value={div.coordinatorContact}
                      onChange={(e) => handleDivisionChange(index, 'coordinatorContact', e.target.value)}
                      className="border border-gray-300 rounded px-2 py-1 text-xs"
                    />
                    <input
                      type="number"
                      placeholder="Capacity"
                      value={div.capacity}
                      onChange={(e) => handleDivisionChange(index, 'capacity', Number(e.target.value))}
                      className="border border-gray-300 rounded px-2 py-1 text-xs"
                      required
                      min={1}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">{editingId ? 'Update Club' : 'Create Club'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
