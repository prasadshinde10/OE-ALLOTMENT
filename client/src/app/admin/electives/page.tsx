'use client'
import { useState, useEffect } from 'react'
import api from '@/lib/api'
import { DataTable } from '@/components/ui/DataTable'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import toast from 'react-hot-toast'
import { Elective, Division } from '@/types'
import { exportToCSV } from '@/lib/csvExport'

const emptyDivision = (): Division => ({
  divisionName: '',
  facultyName: '',
  hallRoom: '',
  facultyContact: '',
  capacity: 30,
})

export default function AdminElectivesPage() {
  const [electives, setElectives] = useState<Elective[]>([])
  const [branches, setBranches] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [assigning, setAssigning] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    offeredByDepartment: '',
    year: 1,
    term: 'Sem-1',
    capacity: 60,
    syllabusUrl: '',
  })
  const [divisions, setDivisions] = useState<Division[]>([])

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
        syllabusUrl: elective.syllabusUrl || '',
      })
      setDivisions(elective.divisions?.map(d => ({ ...d })) || [])
    } else {
      setEditingId(null)
      setFormData({
        name: '',
        code: '',
        offeredByDepartment: '',
        year: 1,
        term: 'Sem-1',
        capacity: 60,
        syllabusUrl: '',
      })
      setDivisions([])
    }
    setIsModalOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const payload = { ...formData, divisions }
      if (editingId) {
        await api.put(`/api/electives/${editingId}`, payload)
        toast.success('Elective updated successfully')
      } else {
        await api.post('/api/electives', payload)
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

  const handleAutoAssign = async (electiveId: string) => {
    if (!confirm('This will auto-assign all enrolled students to divisions based on department grouping. Continue?')) return
    try {
      setAssigning(electiveId)
      const res = await api.post(`/api/admin/divisions/auto-assign/${electiveId}`)
      toast.success(res.data.message || 'Divisions assigned successfully')
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to auto-assign divisions')
    } finally {
      setAssigning(null)
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
          { header: 'Divisions', key: 'divisions', transform: (v) => (v?.length || 0).toString() },
          { header: 'Active', key: 'isActive', transform: (v) => (v ? 'Yes' : 'No') },
        ],
      })
      toast.success(`Exported ${electives.length} elective records`)
    } catch (err) {
      toast.error('Failed to export CSV')
    }
  }

  // Division form helpers
  const addDivision = () => setDivisions([...divisions, emptyDivision()])
  const removeDivision = (idx: number) => setDivisions(divisions.filter((_, i) => i !== idx))
  const updateDivision = (idx: number, field: keyof Division, value: string | number) => {
    setDivisions(divisions.map((d, i) => i === idx ? { ...d, [field]: value } : d))
  }

  const columns = [
    { header: 'Code', accessor: 'code' },
    { header: 'Name', accessor: 'name' },
    { header: 'Dept', accessor: (row: Elective) => row.offeredByDepartment || '-' },
    { header: 'Year', accessor: (row: Elective) => `Y${row.year}` },
    { header: 'Sem', accessor: 'term' },
    { header: 'Cap', accessor: 'capacity' },
    { header: 'Filled', accessor: 'seatsFilled' },
    {
      header: 'Divs',
      accessor: (row: Elective) => (
        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
          (row.divisions?.length || 0) > 0
            ? 'bg-indigo-50 text-indigo-700'
            : 'bg-gray-100 text-gray-500'
        }`}>
          {row.divisions?.length || 0}
        </span>
      ),
    },
    {
      header: 'Actions',
      accessor: (row: Elective) => (
        <div className="flex gap-1.5 flex-wrap">
          <Button size="sm" variant="outline" onClick={() => handleOpenModal(row)}>Edit</Button>
          {(row.divisions?.length || 0) > 0 && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleAutoAssign(row._id)}
              disabled={assigning === row._id}
            >
              {assigning === row._id ? '⏳' : '🔀'} Assign
            </Button>
          )}
          <Button size="sm" variant="danger" onClick={() => handleDelete(row._id)}>Del</Button>
        </div>
      ),
    },
  ]

  const departmentOptions = Array.from(new Set(branches.map((b: any) => b.name)))

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Manage Electives</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExportCSV}>📥 Export CSV</Button>
          <Button onClick={() => handleOpenModal()}>+ Add Elective</Button>
        </div>
      </div>

      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <DataTable columns={columns} data={electives} isLoading={loading} />
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingId ? 'Edit Elective' : 'Add Elective'}>
        <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
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
            <input
              type="text"
              list="department-suggestions"
              value={formData.offeredByDepartment}
              onChange={e => setFormData({ ...formData, offeredByDepartment: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="e.g. CSE, IT, Mechanical"
            />
            <datalist id="department-suggestions">
              {departmentOptions.map(dept => (
                <option key={dept} value={dept} />
              ))}
            </datalist>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
              <select
                value={formData.year}
                onChange={e => setFormData({ ...formData, year: Number(e.target.value) })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
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
              >
                {Array.from({ length: 8 }, (_, i) => (
                  <option key={`sem-${i + 1}`} value={`Sem-${i + 1}`}>Sem-{i + 1}</option>
                ))}
              </select>
            </div>
          </div>

          <Input
            label="Total Seats / Capacity"
            type="number"
            value={formData.capacity}
            onChange={e => setFormData({ ...formData, capacity: Number(e.target.value) })}
            required
            min={1}
          />

          <Input
            label="Syllabus URL (optional)"
            value={formData.syllabusUrl}
            onChange={e => setFormData({ ...formData, syllabusUrl: e.target.value })}
            placeholder="https://drive.google.com/... or paste link"
          />

          {/* ── Divisions Section ── */}
          <div className="border-t border-gray-200 pt-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-800">📋 Divisions</h3>
              <Button type="button" size="sm" variant="outline" onClick={addDivision}>
                + Add Division
              </Button>
            </div>

            {divisions.length === 0 && (
              <p className="text-xs text-gray-400 text-center py-3">
                No divisions configured. Click "Add Division" to set up class sections.
              </p>
            )}

            <div className="space-y-3">
              {divisions.map((div, idx) => (
                <div key={idx} className="bg-gray-50 rounded-lg p-3 border border-gray-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-gray-600">Division {idx + 1}</span>
                    <button
                      type="button"
                      onClick={() => removeDivision(idx)}
                      className="text-red-400 hover:text-red-600 text-xs font-medium"
                    >
                      ✕ Remove
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="Division Name (e.g. Division A)"
                      value={div.divisionName}
                      onChange={e => updateDivision(idx, 'divisionName', e.target.value)}
                      className="border border-gray-300 rounded px-2 py-1.5 text-sm"
                      required
                    />
                    <input
                      type="text"
                      placeholder="Faculty Name"
                      value={div.facultyName}
                      onChange={e => updateDivision(idx, 'facultyName', e.target.value)}
                      className="border border-gray-300 rounded px-2 py-1.5 text-sm"
                      required
                    />
                    <input
                      type="text"
                      placeholder="Hall / Room (optional)"
                      value={div.hallRoom || ''}
                      onChange={e => updateDivision(idx, 'hallRoom', e.target.value)}
                      className="border border-gray-300 rounded px-2 py-1.5 text-sm"
                    />
                    <input
                      type="text"
                      placeholder="Faculty Contact (optional)"
                      value={div.facultyContact || ''}
                      onChange={e => updateDivision(idx, 'facultyContact', e.target.value)}
                      className="border border-gray-300 rounded px-2 py-1.5 text-sm"
                    />
                    <input
                      type="number"
                      placeholder="Capacity"
                      value={div.capacity}
                      onChange={e => updateDivision(idx, 'capacity', Number(e.target.value))}
                      className="border border-gray-300 rounded px-2 py-1.5 text-sm"
                      min={1}
                      required
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-gray-100">
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
