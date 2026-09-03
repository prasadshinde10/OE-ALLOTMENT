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

  const columns = [
    { header: 'PRN', accessor: 'hallTicketNumber' },
    { header: 'Roll No', accessor: (row: Student) => row.rollNumber || '-' },
    {
      header: 'Full Name',
      accessor: (row: Student) => (
        <div>
          <div className="font-semibold text-gray-900">
            {`${row.firstName} ${row.middleName || ''} ${row.lastName}`.replace(/\s+/g, ' ').trim()}
          </div>
          <div className="text-xs text-gray-500">{row.instituteEmail}</div>
        </div>
      ),
    },
    { header: 'Department', accessor: 'branch' },
    {
      header: 'Co-Curricular Club',
      accessor: (row: Student) =>
        row.allocatedCoCurricularClubName ? (
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
        ),
    },
    {
      header: 'Extra-Curricular Club',
      accessor: (row: Student) =>
        row.allocatedExtraCurricularClubName ? (
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
    </div>
  )
}
