'use client'
import { useState, useEffect } from 'react'
import api from '@/lib/api'
import { DataTable } from '@/components/ui/DataTable'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import toast from 'react-hot-toast'
import { Student } from '@/types'

export default function AdminStudentsPage() {
  const [students, setStudents] = useState<Student[]>([])
  const [total, setTotal] = useState(0)
  const [filters, setFilters] = useState({ year: '', search: '', page: 1, limit: 10 })
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isReassignModalOpen, setIsReassignModalOpen] = useState(false)
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)
  const [formData, setFormData] = useState<any>({})
  const [electives, setElectives] = useState([])
  const [newElectiveId, setNewElectiveId] = useState('')

  useEffect(() => {
    fetchStudents()
  }, [filters.page, filters.limit, filters.year])

  const fetchStudents = async () => {
    try {
      const params = new URLSearchParams(filters as any).toString()
      const res = await api.get(`/api/students?${params}`)
      setStudents(res.data.data)
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
      const res = await api.get(`/api/electives?year=${student.year}`)
      setElectives(res.data.data)
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
    if (!newElectiveId) return toast.error('Select an elective')
    try {
      await api.post(`/api/students/${selectedStudent?._id}/reassign`, { newElectiveId })
      toast.success('Student reassigned')
      setIsReassignModalOpen(false)
      fetchStudents()
    } catch (err) {
      toast.error('Error reassigning student')
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

  const columns = [
    { header: 'HT Number', accessor: 'hallTicketNumber' },
    { header: 'Name', accessor: 'name' },
    { header: 'Year/Class', accessor: (row: Student) => `${row.year} / ${row.class}` },
    { header: 'Elective', accessor: (row: Student) => row.allocatedElectiveName || 'None' },
    { 
      header: 'Actions', 
      accessor: (row: Student) => (
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => handleEditClick(row)}>Edit</Button>
          <Button size="sm" variant="outline" onClick={() => handleReassignClick(row)}>Reassign</Button>
          <Button size="sm" variant="danger" onClick={() => handleDelete(row._id)}>Del</Button>
        </div>
      ) 
    }
  ]

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Manage Students</h1>
      
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <form onSubmit={handleSearch} className="flex gap-4 mb-4">
          <Input placeholder="Search name/HT" value={filters.search} onChange={e => setFilters({...filters, search: e.target.value})} className="max-w-xs" />
          <select value={filters.year} onChange={e => setFilters({...filters, year: e.target.value})} className="border-gray-300 rounded-md shadow-sm border px-3">
            <option value="">All Years</option>
            <option value="1">1st Year</option>
            <option value="2">2nd Year</option>
            <option value="3">3rd Year</option>
          </select>
          <Button type="submit">Search</Button>
        </form>
        <DataTable columns={columns} data={students} pagination={{ page: filters.page, limit: filters.limit, total, onPageChange: p => setFilters({...filters, page: p}) }} />
      </div>

      <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Edit Student">
        <form onSubmit={handleSaveEdit} className="space-y-4">
          <Input label="Name" value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} />
          <Input label="Email" value={formData.instituteEmail || ''} onChange={e => setFormData({...formData, instituteEmail: e.target.value})} />
          <Input label="Class" value={formData.class || ''} onChange={e => setFormData({...formData, class: e.target.value})} />
          <Input label="Mobile" value={formData.mobileNumber || ''} onChange={e => setFormData({...formData, mobileNumber: e.target.value})} />
          <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setIsEditModalOpen(false)}>Cancel</Button><Button type="submit">Save</Button></div>
        </form>
      </Modal>

      <Modal isOpen={isReassignModalOpen} onClose={() => setIsReassignModalOpen(false)} title="Reassign Elective">
        <form onSubmit={handleSaveReassign} className="space-y-4">
          <p>Reassigning: <strong>{selectedStudent?.name}</strong></p>
          <select value={newElectiveId} onChange={e => setNewElectiveId(e.target.value)} className="w-full border-gray-300 rounded-md p-2 border" required>
            <option value="">Select Elective</option>
            {electives.map((e: any) => <option key={e._id} value={e._id}>{e.name} ({e.capacity - e.seatsFilled} left)</option>)}
          </select>
          <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setIsReassignModalOpen(false)}>Cancel</Button><Button type="submit">Reassign</Button></div>
        </form>
      </Modal>
    </div>
  )
}
