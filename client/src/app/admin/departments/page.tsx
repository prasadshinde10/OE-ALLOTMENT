'use client'
import { useState, useEffect, useCallback } from 'react'
import api from '@/lib/api'
import { DataTable } from '@/components/ui/DataTable'
import { Button } from '@/components/ui/Button'
import { SkeletonTable } from '@/components/ui/Skeleton'
import toast from 'react-hot-toast'

interface DeptStudent {
  _id: string
  firstName: string
  middleName?: string
  lastName?: string
  hallTicketNumber?: string
  rollNumber?: string
  branch: string
  year: number
  allocatedElectiveName?: string
  allocatedDivision?: string
  allocatedFaculty?: string
  allocatedHall?: string
}

export default function DepartmentOverviewPage() {
  const [students, setStudents] = useState<DeptStudent[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [department, setDepartment] = useState('')
  const [year, setYear] = useState('')
  const [elective, setElective] = useState('')
  const [departments, setDepartments] = useState<string[]>([])
  const [electives, setElectives] = useState<string[]>([])
  const [exporting, setExporting] = useState(false)
  const [exportingZip, setExportingZip] = useState(false)
  const limit = 50

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      params.set('page', String(page))
      params.set('limit', String(limit))
      if (department) params.set('department', department)
      if (year) params.set('year', year)
      if (elective) params.set('elective', elective)

      const res = await api.get(`/api/admin/department-overview?${params.toString()}`)
      setStudents(res.data.data || [])
      setTotal(res.data.total || 0)
      if (res.data.filters) {
        setDepartments(res.data.filters.departments || [])
        setElectives(res.data.filters.electives || [])
      }
    } catch (err) {
      toast.error('Failed to load department overview')
    } finally {
      setLoading(false)
    }
  }, [page, department, year, elective])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Reset page when filters change
  useEffect(() => {
    setPage(1)
  }, [department, year, elective])

  const handleExportCSV = async () => {
    try {
      setExporting(true)
      const params = new URLSearchParams()
      if (department) params.set('department', department)
      if (year) params.set('year', year)
      if (elective) params.set('elective', elective)

      const res = await api.get(`/api/admin/department-overview/export?${params.toString()}`, {
        responseType: 'blob',
      })
      const filename = department
        ? `${department.replace(/\s+/g, '_')}_Allotment_Report.csv`
        : 'All_Departments_Allotment_Report.csv'
      const url = URL.createObjectURL(res.data)
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
      toast.success('CSV exported successfully')
    } catch (err) {
      toast.error('Failed to export CSV')
    } finally {
      setExporting(false)
    }
  }

  const handleExportZip = async () => {
    try {
      setExportingZip(true)
      const params = new URLSearchParams()
      if (year) params.set('year', year)

      const res = await api.get(`/api/admin/department-overview/export-all?${params.toString()}`, {
        responseType: 'blob',
      })
      const url = URL.createObjectURL(res.data)
      const link = document.createElement('a')
      link.href = url
      link.download = 'Department_Allotment_Reports.zip'
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
      toast.success('ZIP exported successfully')
    } catch (err) {
      toast.error('Failed to export ZIP')
    } finally {
      setExportingZip(false)
    }
  }

  const totalPages = Math.ceil(total / limit)

  const columns = [
    {
      header: 'PRN / Roll No',
      accessor: (s: DeptStudent) => s.hallTicketNumber || s.rollNumber || '-',
    },
    {
      header: 'Student Name',
      accessor: (s: DeptStudent) =>
        [s.firstName, s.middleName, s.lastName].filter(Boolean).join(' ') || '-',
    },
    { header: 'Department', accessor: 'branch' as keyof DeptStudent },
    { header: 'Year', accessor: (s: DeptStudent) => `Year ${s.year}` },
    {
      header: 'Elective',
      accessor: (s: DeptStudent) => s.allocatedElectiveName || '-',
    },
    {
      header: 'Division',
      accessor: (s: DeptStudent) => s.allocatedDivision ? (
        <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-full text-xs font-medium">
          {s.allocatedDivision}
        </span>
      ) : (
        <span className="text-gray-400 text-xs">Unassigned</span>
      ),
    },
    {
      header: 'Faculty',
      accessor: (s: DeptStudent) => s.allocatedFaculty || '-',
    },
    {
      header: 'Hall / Room',
      accessor: (s: DeptStudent) => s.allocatedHall || '-',
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Departmental Master Overview</h1>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={handleExportCSV}
            disabled={exporting}
          >
            {exporting ? '⏳ Exporting...' : '📥 Export CSV'}
          </Button>
          <Button
            variant="outline"
            onClick={handleExportZip}
            disabled={exportingZip}
          >
            {exportingZip ? '⏳ Exporting...' : '📦 Export All (ZIP)'}
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
            <select
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="">All Departments</option>
              {departments.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
            <select
              value={year}
              onChange={(e) => setYear(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="">All Years</option>
              <option value="1">1st Year</option>
              <option value="2">2nd Year</option>
              <option value="3">3rd Year</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Elective</label>
            <select
              value={elective}
              onChange={(e) => setElective(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="">All Electives</option>
              {electives.map((el) => (
                <option key={el} value={el}>
                  {el}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Results count */}
      <div className="text-sm text-gray-500">
        Showing {students.length} of {total} allocated students
        {department && <span className="ml-1 font-medium text-indigo-600">in {department}</span>}
      </div>

      {/* Data table */}
      {loading ? (
        <SkeletonTable rows={8} cols={8} />
      ) : (
        <DataTable columns={columns} data={students} />
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-sm text-gray-500">
            Page {page} of {totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              ← Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next →
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
