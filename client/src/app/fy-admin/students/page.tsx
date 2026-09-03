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
        <Button variant="outline" onClick={handleExportCSV}>
          📥 Export CSV
        </Button>
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
    </div>
  )
}
