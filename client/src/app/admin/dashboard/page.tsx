'use client'
import { useState, useEffect } from 'react'
import api from '@/lib/api'
import { Button } from '@/components/ui/Button'
import { SkeletonStat, Skeleton } from '@/components/ui/Skeleton'
import { exportToCSV } from '@/lib/csvExport'
import toast from 'react-hot-toast'

interface DashboardStats {
  totalStudents: number
  verifiedStudents: number
  allocatedStudents: number
  activeElectives: number
  totalElectives: number
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [exportingStudents, setExportingStudents] = useState(false)
  const [exportingElectives, setExportingElectives] = useState(false)

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const statsRes = await api.get('/api/admin/stats')
        setStats(statsRes.data.data)
      } catch (err) {
        console.error('Failed to load dashboard stats', err)
      } finally {
        setLoading(false)
      }
    }
    fetchDashboardData()
  }, [])

  const handleExportStudents = async () => {
    try {
      setExportingStudents(true)
      const res = await api.get('/api/students?limit=10000')
      const allStudents = res.data.data || []
      if (allStudents.length === 0) {
        toast.error('No student records found to export')
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
      toast.error('Failed to export students')
    } finally {
      setExportingStudents(false)
    }
  }

  const handleExportElectives = async () => {
    try {
      setExportingElectives(true)
      const res = await api.get('/api/electives')
      const allElectives = res.data.data || []
      if (allElectives.length === 0) {
        toast.error('No elective records found to export')
        return
      }

      exportToCSV(allElectives, {
        filename: 'electives-report',
        columns: [
          { header: 'Code', key: 'code' },
          { header: 'Name', key: 'name' },
          { header: 'Offered By Department', key: 'offeredByDepartment', transform: (v) => v || '-' },
          { header: 'Year', key: 'year' },
          { header: 'Semester', key: 'term' },
          { header: 'Capacity', key: 'capacity' },
          { header: 'Seats Filled', key: 'seatsFilled' },
          { header: 'Available Seats', key: 'capacity', transform: (_v, row) => String(row.capacity - (row.seatsFilled || 0)) },
          { header: 'Active', key: 'isActive', transform: (v) => (v ? 'Yes' : 'No') },
        ],
      })
      toast.success(`Exported ${allElectives.length} elective records`)
    } catch (err) {
      toast.error('Failed to export electives')
    } finally {
      setExportingElectives(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6 animate-fadeIn">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <Skeleton className="h-8 w-48" />
          <div className="flex gap-2">
            <Skeleton className="h-10 w-44 rounded-lg" />
            <Skeleton className="h-10 w-44 rounded-lg" />
          </div>
        </div>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-3 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, idx) => (
            <SkeletonStat key={idx} />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleExportStudents}
            disabled={exportingStudents}
          >
            {exportingStudents ? '⏳ Exporting...' : '📥 Export Students CSV'}
          </Button>
          <Button
            variant="outline"
            onClick={handleExportElectives}
            disabled={exportingElectives}
          >
            {exportingElectives ? '⏳ Exporting...' : '📥 Export Electives CSV'}
          </Button>
        </div>
      </div>

      {stats && (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-3 lg:grid-cols-5">
          <StatCard title="Total Students" value={stats.totalStudents} color="indigo" />
          <StatCard title="Verified Students" value={stats.verifiedStudents} color="green" />
          <StatCard title="Allocated Students" value={stats.allocatedStudents} color="blue" />
          <StatCard title="Active Electives" value={stats.activeElectives} color="purple" />
          <StatCard title="Total Electives" value={stats.totalElectives} color="gray" />
        </div>
      )}
    </div>
  )
}

function StatCard({ title, value, color }: { title: string; value: number; color: string }) {
  const colorMap: Record<string, string> = {
    indigo: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    green: 'bg-green-50 text-green-700 border-green-200',
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
    purple: 'bg-purple-50 text-purple-700 border-purple-200',
    gray: 'bg-gray-50 text-gray-700 border-gray-200',
  }

  return (
    <div className={`rounded-xl p-6 border ${colorMap[color] || colorMap.gray}`}>
      <p className="text-sm font-medium opacity-75">{title}</p>
      <p className="text-3xl font-bold mt-2">{value ?? 0}</p>
    </div>
  )
}
