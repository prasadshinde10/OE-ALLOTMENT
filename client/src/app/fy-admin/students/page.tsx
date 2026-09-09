'use client'

import { useState, useEffect } from 'react'
import api from '@/lib/api'
import { DataTable } from '@/components/ui/DataTable'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import toast from 'react-hot-toast'
import { Student } from '@/types'

export default function FYAdminStudentsPage() {
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [branches, setBranches] = useState<any[]>([])

  const [filters, setFilters] = useState({
    search: '',
    branch: '',
    status: '',
    page: 1,
    limit: 15,
  })

  useEffect(() => {
    fetchStudents()
  }, [filters.page, filters.limit, filters.branch, filters.status])

  useEffect(() => {
    fetchBranches()
  }, [])

  const fetchBranches = async () => {
    try {
      const res = await api.get('/api/fy-admin/branches')
      setBranches(res.data.data || [])
    } catch (err) {
      setBranches([])
    }
  }

  const fetchStudents = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (filters.search) params.set('search', filters.search)
      if (filters.branch) params.set('branch', filters.branch)
      if (filters.status) params.set('status', filters.status)
      params.set('page', String(filters.page))
      params.set('limit', String(filters.limit))

      const res = await api.get(`/api/fy-admin/students?${params.toString()}`)
      setStudents(res.data.data || [])
      setTotal(res.data.total || 0)
    } catch (err) {
      toast.error('Failed to load FY students')
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setFilters((prev) => ({ ...prev, page: 1 }))
    fetchStudents()
  }

  const handleExportCSV = async () => {
    try {
      const params = new URLSearchParams()
      if (filters.branch) params.set('branch', filters.branch)
      const res = await api.get(`/api/fy-admin/export?${params.toString()}`, { responseType: 'blob' })
      const url = window.URL.createObjectURL(new Blob([res.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `FY_Students_Report_${new Date().toISOString().split('T')[0]}.csv`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      toast.success('CSV export downloaded')
    } catch (err) {
      toast.error('Export failed')
    }
  }

  const [reallocateModal, setReallocateModal] = useState<{
    isOpen: boolean
    student: Student | null
    category: 'co-curricular' | 'extra-curricular'
    newClubId: string
  }>({
    isOpen: false,
    student: null,
    category: 'co-curricular',
    newClubId: '',
  })
  const [availableClubs, setAvailableClubs] = useState<any[]>([])
  const [reallocating, setReallocating] = useState(false)

  const handleOpenReallocate = async (student: Student, defaultCategory: 'co-curricular' | 'extra-curricular' = 'co-curricular') => {
    try {
      const res = await api.get('/api/clubs?year=1')
      setAvailableClubs(res.data.data || [])
      setReallocateModal({
        isOpen: true,
        student,
        category: defaultCategory,
        newClubId: '',
      })
    } catch (err) {
      toast.error('Failed to load club options')
    }
  }

  const handleExecuteReallocate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!reallocateModal.student || !reallocateModal.newClubId) {
      toast.error('Please select a replacement club')
      return
    }

    try {
      setReallocating(true)
      await api.post('/api/fy-admin/reallocate', {
        studentId: reallocateModal.student._id,
        newClubId: reallocateModal.newClubId,
      })
      toast.success('Club reallocated successfully')
      setReallocateModal({ isOpen: false, student: null, category: 'co-curricular', newClubId: '' })
      fetchStudents()
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Reallocation failed')
    } finally {
      setReallocating(false)
    }
  }

  const filteredClubOptions = availableClubs.filter(
    (c) => c.category === reallocateModal.category && c.isActive
  )

  // Single Student Delete State
  const [singleDeleteModal, setSingleDeleteModal] = useState<{
    isOpen: boolean
    student: Student | null
  }>({
    isOpen: false,
    student: null,
  })
  const [deletingSingle, setDeletingSingle] = useState(false)

  // Bulk Student Delete State
  const [bulkDeleteModal, setBulkDeleteModal] = useState(false)
  const [bulkConfirmText, setBulkConfirmText] = useState('')
  const [deletingBulk, setDeletingBulk] = useState(false)

  const handleConfirmSingleDelete = async () => {
    if (!singleDeleteModal.student) return
    try {
      setDeletingSingle(true)
      await api.delete(`/api/admin/students/${singleDeleteModal.student._id}`)
      toast.success(`Student ${singleDeleteModal.student.firstName} ${singleDeleteModal.student.lastName} deleted successfully`)
      setSingleDeleteModal({ isOpen: false, student: null })
      fetchStudents()
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to delete student')
    } finally {
      setDeletingSingle(false)
    }
  }

  const handleConfirmBulkDelete = async (e: React.FormEvent) => {
    e.preventDefault()
    if (bulkConfirmText.trim() !== 'DELETE ALL FE STUDENTS') {
      toast.error('Please type "DELETE ALL FE STUDENTS" to confirm.')
      return
    }
    try {
      setDeletingBulk(true)
      const res = await api.delete('/api/admin/students/delete-all')
      toast.success(res.data?.message || 'All First-Year student records have been permanently purged.')
      setBulkDeleteModal(false)
      setBulkConfirmText('')
      fetchStudents()
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to purge students')
    } finally {
      setDeletingBulk(false)
    }
  }

  const columns = [
    { header: 'Roll No', accessor: (row: Student) => <span className="font-mono text-xs font-semibold bg-gray-100 px-2 py-1 rounded">{row.rollNumber || 'N/A'}</span> },
    {
      header: 'Student Details',
      accessor: (row: Student) => (
        <div>
          <div className="font-semibold text-gray-900">
            {`${row.firstName} ${row.middleName || ''} ${row.lastName}`.replace(/\s+/g, ' ').trim()}
          </div>
          <div className="text-xs text-indigo-600 font-mono mt-0.5">{row.instituteEmail}</div>
        </div>
      ),
    },
    { header: 'Department', accessor: 'branch' },
    {
      header: 'Co-Curricular Club',
      accessor: (row: Student) => (
        <div className="flex items-center justify-between gap-2">
          {row.allocatedCoCurricularClubName ? (
            <div>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-50 text-indigo-700">
                {row.allocatedCoCurricularClubName}
              </span>
              {row.allocatedCoCurricularDivision && (
                <div className="text-[10px] text-gray-500 mt-0.5">
                  {row.allocatedCoCurricularDivision} • {row.allocatedCoCurricularHall || 'Hall N/A'}
                </div>
              )}
            </div>
          ) : (
            <span className="text-xs text-gray-400 italic">Not Allocated</span>
          )}
          <button
            type="button"
            onClick={() => handleOpenReallocate(row, 'co-curricular')}
            className="text-[11px] text-indigo-600 hover:text-indigo-800 font-medium underline"
          >
            {row.allocatedCoCurricularClubName ? 'Reassign' : 'Assign'}
          </button>
        </div>
      ),
    },
    {
      header: 'Extra-Curricular Club',
      accessor: (row: Student) => (
        <div className="flex items-center justify-between gap-2">
          {row.allocatedExtraCurricularClubName ? (
            <div>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-50 text-purple-700">
                {row.allocatedExtraCurricularClubName}
              </span>
              {row.allocatedExtraCurricularDivision && (
                <div className="text-[10px] text-gray-500 mt-0.5">
                  {row.allocatedExtraCurricularDivision} • {row.allocatedExtraCurricularHall || 'Hall N/A'}
                </div>
              )}
            </div>
          ) : (
            <span className="text-xs text-gray-400 italic">Not Allocated</span>
          )}
          <button
            type="button"
            onClick={() => handleOpenReallocate(row, 'extra-curricular')}
            className="text-[11px] text-purple-600 hover:text-purple-800 font-medium underline"
          >
            {row.allocatedExtraCurricularClubName ? 'Reassign' : 'Assign'}
          </button>
        </div>
      ),
    },
    {
      header: 'Actions',
      accessor: (row: Student) => (
        <div className="flex items-center justify-center">
          <button
            type="button"
            title={`Delete ${row.firstName} ${row.lastName}`}
            onClick={() => setSingleDeleteModal({ isOpen: true, student: row })}
            className="p-1.5 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">First-Year Student Directory</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Monitor and export club allocation status across all Year-1 students ({total} students registered)
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            type="button"
            onClick={() => {
              setBulkConfirmText('')
              setBulkDeleteModal(true)
            }}
            className="bg-red-600 hover:bg-red-700 text-white flex items-center gap-2 text-sm shadow-sm transition-colors"
          >
            <span>🗑️</span>
            <span>Delete All Students</span>
          </Button>
          <Button variant="outline" onClick={handleExportCSV}>
            📥 Export CSV
          </Button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
        <form onSubmit={handleSearch} className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-end">
          <div>
            <Input
              label="Search Name / PRN / Roll"
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              placeholder="e.g. 20240101..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
            <select
              value={filters.branch}
              onChange={(e) => setFilters({ ...filters, branch: e.target.value, page: 1 })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">All Departments</option>
              {branches.map((b) => (
                <option key={b._id || b.name} value={b.name}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Allocation Status</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value, page: 1 })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">All Statuses</option>
              <option value="allocated_both">Fully Allocated (Both Clubs)</option>
              <option value="allocated_partial">Partially Allocated (1 Club)</option>
              <option value="unallocated">Unallocated (0 Clubs)</option>
            </select>
          </div>

          <div>
            <Button type="submit" className="w-full">
              Search
            </Button>
          </div>
        </form>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <DataTable
          columns={columns}
          data={students}
          isLoading={loading}
          pagination={{
            page: filters.page,
            limit: filters.limit,
            total,
            onPageChange: (page) => setFilters((prev) => ({ ...prev, page })),
          }}
        />
      </div>

      {/* Re-allocation Override Modal */}
      {reallocateModal.isOpen && reallocateModal.student && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-fadeIn">
            <div className="flex justify-between items-start border-b pb-3">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Manual Club Re-allocation</h3>
                <p className="text-xs text-gray-500">
                  Override and re-assign club for {reallocateModal.student.firstName} {reallocateModal.student.lastName} ({reallocateModal.student.rollNumber || reallocateModal.student.instituteEmail})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setReallocateModal({ isOpen: false, student: null, category: 'co-curricular', newClubId: '' })}
                className="text-gray-400 hover:text-gray-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleExecuteReallocate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1">
                  Club Category
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setReallocateModal((prev) => ({ ...prev, category: 'co-curricular', newClubId: '' }))}
                    className={`py-2 px-3 text-xs font-medium rounded-lg border text-center transition-colors ${
                      reallocateModal.category === 'co-curricular'
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    🎓 Co-Curricular
                  </button>
                  <button
                    type="button"
                    onClick={() => setReallocateModal((prev) => ({ ...prev, category: 'extra-curricular', newClubId: '' }))}
                    className={`py-2 px-3 text-xs font-medium rounded-lg border text-center transition-colors ${
                      reallocateModal.category === 'extra-curricular'
                        ? 'bg-purple-600 text-white border-purple-600'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    🎨 Extra-Curricular
                  </button>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-gray-50 border border-gray-200 text-xs space-y-1">
                <div className="text-gray-500">
                  Currently Allocated:{' '}
                  <span className="font-semibold text-gray-800">
                    {reallocateModal.category === 'co-curricular'
                      ? reallocateModal.student.allocatedCoCurricularClubName || 'None'
                      : reallocateModal.student.allocatedExtraCurricularClubName || 'None'}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1">
                  Select Target Club
                </label>
                <select
                  value={reallocateModal.newClubId}
                  onChange={(e) => setReallocateModal((prev) => ({ ...prev, newClubId: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
                  required
                >
                  <option value="">-- Choose Club ({filteredClubOptions.length} available) --</option>
                  {filteredClubOptions.map((c) => {
                    const remaining = Math.max(0, c.capacity - c.seatsFilled)
                    return (
                      <option key={c._id} value={c._id} disabled={remaining <= 0}>
                        {c.name} ({c.code}) — {remaining} / {c.capacity} seats left {remaining <= 0 ? '(FULL)' : ''}
                      </option>
                    )
                  })}
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setReallocateModal({ isOpen: false, student: null, category: 'co-curricular', newClubId: '' })}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={reallocating || !reallocateModal.newClubId}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white"
                >
                  {reallocating ? 'Re-assigning...' : 'Confirm Re-allocation'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Single Student Delete Confirmation Modal */}
      {singleDeleteModal.isOpen && singleDeleteModal.student && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-red-600">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Delete Student</h3>
                <p className="text-xs text-gray-500">Confirm student record removal</p>
              </div>
            </div>

            <div className="p-4 bg-red-50 rounded-xl border border-red-100 text-sm text-red-900">
              <p>
                Are you sure you want to delete{' '}
                <span className="font-bold">
                  {singleDeleteModal.student.firstName} {singleDeleteModal.student.lastName}
                </span>{' '}
                ({singleDeleteModal.student.hallTicketNumber || singleDeleteModal.student.rollNumber || 'No PRN'})? This action cannot be undone.
              </p>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setSingleDeleteModal({ isOpen: false, student: null })}
                disabled={deletingSingle}
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleConfirmSingleDelete}
                disabled={deletingSingle}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {deletingSingle ? 'Deleting...' : 'Confirm Delete'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Delete Double-Confirmation Modal */}
      {bulkDeleteModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 border-2 border-red-500">
            <div className="flex items-center gap-3 text-red-600 border-b pb-3">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0 text-2xl">
                ⚠️
              </div>
              <div>
                <h3 className="text-lg font-bold text-red-700">Permanent Bulk Purge</h3>
                <p className="text-xs text-gray-500">First-Year Student Records & Club Allotments</p>
              </div>
            </div>

            <div className="p-4 bg-red-50 border border-red-300 rounded-xl space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-red-800">
                ⚠️ CRITICAL WARNING: You are about to permanently delete ALL First-Year student records and their current club allotment histories.
              </h4>
              <p className="text-xs text-red-700 leading-relaxed">
                This will purge all ({total}) Year-1 student profiles, reset club seat counts back to zero, and erase all related allocation histories. Upper-year records will remain completely untouched. This action is irreversible.
              </p>
            </div>

            <form onSubmit={handleConfirmBulkDelete} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  To confirm, type <span className="font-mono font-bold text-red-600">DELETE ALL FE STUDENTS</span> below:
                </label>
                <Input
                  value={bulkConfirmText}
                  onChange={(e) => setBulkConfirmText(e.target.value)}
                  placeholder="DELETE ALL FE STUDENTS"
                  className="font-mono text-sm border-red-300 focus:border-red-500 focus:ring-red-500"
                  autoFocus
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setBulkDeleteModal(false)
                    setBulkConfirmText('')
                  }}
                  disabled={deletingBulk}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={bulkConfirmText.trim() !== 'DELETE ALL FE STUDENTS' || deletingBulk}
                  className={`text-white transition-all ${
                    bulkConfirmText.trim() === 'DELETE ALL FE STUDENTS'
                      ? 'bg-red-600 hover:bg-red-700 cursor-pointer shadow-md'
                      : 'bg-red-300 cursor-not-allowed'
                  }`}
                >
                  {deletingBulk ? 'Purging All Students...' : 'Permanently Delete All'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
