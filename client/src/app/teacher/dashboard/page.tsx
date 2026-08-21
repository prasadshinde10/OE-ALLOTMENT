'use client'
import { useState, useEffect } from 'react'
import api from '@/lib/api'
import { DataTable } from '@/components/ui/DataTable'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'

export default function TeacherDashboard() {
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(false)
  const [total, setTotal] = useState(0)
  const [filters, setFilters] = useState({
    year: '',
    class: '',
    term: '',
    search: '',
    page: 1,
    limit: 10
  })

  useEffect(() => {
    fetchStudents()
  }, [filters.page, filters.limit, filters.year, filters.class, filters.term])

  const fetchStudents = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams(filters as any).toString()
      const res = await api.get(`/api/students?${params}`)
      setStudents(res.data.data)
      setTotal(res.data.pagination.total)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFilters({ ...filters, [e.target.name]: e.target.value, page: 1 })
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    fetchStudents()
  }

  const handleExport = async () => {
    try {
      const params = new URLSearchParams({ year: filters.year, term: filters.term }).toString()
      const res = await api.get(`/api/export/students?${params}`, { responseType: 'blob' })
      const url = window.URL.createObjectURL(new Blob([res.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `students_export_${new Date().getTime()}.xlsx`)
      document.body.appendChild(link)
      link.click()
      link.remove()
    } catch (err) {
      console.error('Export failed', err)
    }
  }

  const columns = [
    { header: 'HT Number', accessor: 'hallTicketNumber' },
    { header: 'Name', accessor: 'name' },
    { header: 'Class', accessor: 'class' },
    { header: 'Year', accessor: 'year' },
    { header: 'Elective', accessor: (row: any) => row.allocatedElective?.name || 'Unallocated' },
    { header: 'Allocated At', accessor: (row: any) => row.allocationTime ? new Date(row.allocationTime).toLocaleString() : '-' },
  ]

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Teacher Dashboard</h1>
        <Button onClick={handleExport} variant="outline">Export to Excel</Button>
      </div>

      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <form onSubmit={handleSearch} className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
            <select name="year" value={filters.year} onChange={handleFilterChange} className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm border py-2 px-3">
              <option value="">All Years</option>
              <option value="1">1st Year</option>
              <option value="2">2nd Year</option>
              <option value="3">3rd Year</option>
            </select>
          </div>
          <div>
            <Input label="Class" name="class" value={filters.class} onChange={handleFilterChange} placeholder="e.g. CS-A" />
          </div>
          <div>
            <Input label="Term" name="term" value={filters.term} onChange={handleFilterChange} placeholder="e.g. 2024-Fall" />
          </div>
          <div>
            <Input label="Search Name/HT" name="search" value={filters.search} onChange={handleFilterChange} />
          </div>
          <Button type="submit">Search</Button>
        </form>
      </div>

      {loading ? (
        <div className="flex justify-center p-12"><LoadingSpinner /></div>
      ) : (
        <DataTable
          columns={columns}
          data={students}
          pagination={{
            page: filters.page,
            limit: filters.limit,
            total,
            onPageChange: (page) => setFilters(f => ({ ...f, page }))
          }}
        />
      )}
    </div>
  )
}
