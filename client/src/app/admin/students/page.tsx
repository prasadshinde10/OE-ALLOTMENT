'use client'
import { useState, useEffect } from 'react'
import api from '@/lib/api'
import { DataTable } from '@/components/ui/DataTable'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import toast from 'react-hot-toast'
import { Student, Elective } from '@/types'
import { exportToCSV } from '@/lib/csvExport'

export default function AdminStudentsPage() {
  const [students, setStudents] = useState<Student[]>([])
  const [total, setTotal] = useState(0)
  const [filters, setFilters] = useState({ year: '', search: '', page: 1, limit: 10 })
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isReassignModalOpen, setIsReassignModalOpen] = useState(false)
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)
  const [formData, setFormData] = useState<any>({})
  const [electives, setElectives] = useState<Elective[]>([])
  const [newElectiveId, setNewElectiveId] = useState('')
  const [reassigning, setReassigning] = useState(false)
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    fetchStudents()
  }, [filters.page, filters.limit, filters.year])

  const fetchStudents = async () => {
    try {
      const params = new URLSearchParams(filters as any).toString()
      const res = await api.get(`/api/students?${params}`)
      setStudents(res.data.data || [])
      setTotal(res.data.total || res.data.pagination?.total || 0)
    } catch (err) {
      toast.error('Failed to load students')
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    fetchStudents()
  }

  const handleEditClick = (student: Student) => {
    setSelectedStudent(student)
    setFormData(student)
    setIsEditModalOpen(true)
  }

  const handleReassignClick = async (student: Student) => {
    setSelectedStudent(student)
    try {
      const res = await api.get(`/api/electives?year=${student.year}&active=true`)
      setElectives(res.data.data || [])
      setNewElectiveId('')
      setIsReassignModalOpen(true)
    } catch (err) {
      toast.error('Failed to load electives')
    }
  }

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await api.put(`/api/students/${selectedStudent?._id}`, formData)
      toast.success('Student updated')
      setIsEditModalOpen(false)
      fetchStudents()
    } catch (err) {
      toast.error('Error updating student')
    }
  }

  const handleSaveReassign = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newElectiveId) return toast.error('Please select a target elective')
    try {
      setReassigning(true)
      await api.post(`/api/students/${selectedStudent?._id}/reassign`, { newElectiveId })
      toast.success('Student reassigned successfully')
      setIsReassignModalOpen(false)
      fetchStudents()
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error reassigning student')
    } finally {
      setReassigning(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this student?')) return
    try {
      await api.delete(`/api/students/${id}`)
      toast.success('Student deleted')
      fetchStudents()
    } catch (err) {
      toast.error('Error deleting student')
    }
  }

  const handleExportCSV = async () => {
    try {
      setExporting(true)
      // Fetch ALL students (no pagination limit) for export
      const params = new URLSearchParams()
      params.set('limit', '10000')
      if (filters.year) params.set('year', filters.year)
      if (filters.search) params.set('search', filters.search)
      const res = await api.get(`/api/students?${params.toString()}`)
      const allStudents: Student[] = res.data.data || []

      if (allStudents.length === 0) {
        toast.error('No student records to export')
        return
      }

      exportToCSV(allStudents, {
        filename: 'student-allotments',
        columns: [
          { header: 'Hall Ticket Number', key: 'hallTicketNumber' },
          { header: 'First Name', key: 'firstName' },
          { header: 'Middle Name', key: 'middleName', transform: (v) => v || '' },
          { header: 'Last Name', key: 'lastName' },
          { header: 'Email', key: 'instituteEmail' },
          { header: 'Mobile', key: 'mobileNumber' },
          { header: 'Year', key: 'year' },
          { header: 'Branch', key: 'branch' },
          { header: 'Semester', key: 'semester' },
          { header: 'Roll Number', key: 'rollNumber' },
          { header: 'Verified', key: 'isVerified', transform: (v) => (v ? 'Yes' : 'No') },
          { header: 'Allocated Elective', key: 'allocatedElectiveName', transform: (v) => v || 'None' },
          { header: 'Allocated Term', key: 'allocatedTerm', transform: (v) => v || '-' },
          {
            header: 'Allocation Date',
            key: 'allocationTimestamp',
            transform: (v) => (v ? new Date(v).toLocaleString() : '-'),
          },
        ],
      })

      toast.success(`Exported ${allStudents.length} student records`)
    } catch (err) {
      toast.error('Failed to export CSV')
    } finally {
      setExporting(false)
    }
  }

  const columns = [
    { header: 'HT Number', accessor: 'hallTicketNumber' },
    {
      header: 'Name',
      accessor: (row: Student) =>
        `${row.firstName} ${row.middleName || ''} ${row.lastName}`.replace(/\s+/g, ' ').trim(),
    },
    { header: 'Year/Branch', accessor: (row: Student) => `${row.year} / ${row.branch}` },
    { header: 'Allocated Elective', accessor: (row: Student) => row.allocatedElectiveName || 'None' },
    {
      header: 'Actions',
      accessor: (row: Student) => (
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => handleEditClick(row)}>
            Edit
          </Button>
          <Button size="sm" variant="outline" onClick={() => handleReassignClick(row)}>
            Reassign
          </Button>
          <Button size="sm" variant="danger" onClick={() => handleDelete(row._id)}>
            Del
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Manage Students</h1>
        <Button variant="outline" onClick={handleExportCSV} disabled={exporting}>
          {exporting ? '⏳ Exporting...' : '📥 Export to CSV'}
        </Button>
      </div>

      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <form onSubmit={handleSearch} className="flex gap-4 mb-4">
          <Input
            placeholder="Search name/HT"
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            className="max-w-xs"
          />
          <select
            value={filters.year}
            onChange={(e) => setFilters({ ...filters, year: e.target.value })}
            className="border-gray-300 rounded-md shadow-sm border px-3"
          >
            <option value="">All Years</option>
            <option value="1">1st Year</option>
            <option value="2">2nd Year</option>
            <option value="3">3rd Year</option>
          </select>
          <Button type="submit">Search</Button>
        </form>
        <DataTable
          columns={columns}
          data={students}
          pagination={{
            page: filters.page,
            limit: filters.limit,
            total,
            onPageChange: (p) => setFilters({ ...filters, page: p }),
          }}
        />
      </div>

      <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Edit Student">
        <form onSubmit={handleSaveEdit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <Input
              label="First Name"
              value={formData.firstName || ''}
              onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
              required
            />
            <Input
              label="Middle Name"
              value={formData.middleName || ''}
              onChange={(e) => setFormData({ ...formData, middleName: e.target.value })}
            />
            <Input
              label="Last Name"
              value={formData.lastName || ''}
              onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
              required
            />
          </div>
          <Input
            label="Email"
            value={formData.instituteEmail || ''}
            onChange={(e) => setFormData({ ...formData, instituteEmail: e.target.value })}
          />
          <Input
            label="Branch"
            value={formData.branch || ''}
            onChange={(e) => setFormData({ ...formData, branch: e.target.value })}
          />
          <Input
            label="Mobile"
            value={formData.mobileNumber || ''}
            onChange={(e) => setFormData({ ...formData, mobileNumber: e.target.value })}
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setIsEditModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Save</Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={isReassignModalOpen}
        onClose={() => setIsReassignModalOpen(false)}
        title="Reassign Elective"
      >
        <form onSubmit={handleSaveReassign} className="space-y-4">
          <div className="bg-gray-50 p-3 rounded-lg text-sm space-y-1">
            <p>
              Student: <strong>{selectedStudent ? `${selectedStudent.firstName} ${selectedStudent.lastName}` : ''}</strong> ({selectedStudent?.hallTicketNumber})
            </p>
            <p>
              Current Elective: <strong className="text-indigo-600">{selectedStudent?.allocatedElectiveName || 'None'}</strong>
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Select New Elective</label>
            <select
              value={newElectiveId}
              onChange={(e) => setNewElectiveId(e.target.value)}
              className="w-full border-gray-300 rounded-lg p-2.5 border text-sm focus:ring-2 focus:ring-indigo-500"
              required
            >
              <option value="">-- Select Target Elective --</option>
              {electives.map((e: any) => {
                const isCurrent = String(selectedStudent?.allocatedElectiveId) === String(e._id)
                const available = e.capacity - e.seatsFilled
                return (
                  <option
                    key={e._id}
                    value={e._id}
                    disabled={isCurrent || (available <= 0 && !isCurrent)}
                  >
                    {e.name} ({e.code}) {e.offeredByDepartment ? `[Dept: ${e.offeredByDepartment}]` : ''} - {available} seats left {isCurrent ? '(Current)' : available <= 0 ? '(Full)' : ''}
                  </option>
                )
              })}
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsReassignModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!newElectiveId || reassigning}>
              {reassigning ? 'Reassigning...' : 'Confirm Reassign'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
