'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import api from '@/lib/api'
import { Button } from '@/components/ui/Button'
import { SkeletonStat } from '@/components/ui/Skeleton'
import { exportToCSV } from '@/lib/csvExport'
import toast from 'react-hot-toast'

interface DashboardStats {
  totalStudents: number
  verifiedStudents: number
  allocatedStudents: number
  activeElectives: number
  totalElectives: number
}

export default function ElectiveDashboardPage() {
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
        filename: 'senior-student-allotments',
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
          { header: 'Allocated Elective', key: 'allocatedElectiveName', transform: (v) => v || 'Not Allocated' },
          { header: 'Division', key: 'allocatedDivision', transform: (v) => v || 'N/A' },
          { header: 'Allotment Time', key: 'allocatedTimestamp', transform: (v) => v ? new Date(v).toLocaleString() : 'N/A' },
        ],
      })
      toast.success('Senior student export downloaded')
    } catch (err) {
      toast.error('Failed to export students')
    } finally {
      setExportingStudents(false)
    }
  }

  const handleExportElectives = async () => {
    try {
      setExportingElectives(true)
      const res = await api.get('/api/electives?limit=1000')
      const allElectives = res.data.data || []
      if (allElectives.length === 0) {
        toast.error('No electives found to export')
        return
      }

      exportToCSV(allElectives, {
        filename: 'open-electives-overview',
        columns: [
          { header: 'Course Code', key: 'courseCode' },
          { header: 'Name', key: 'name' },
          { header: 'Offering Department', key: 'offeredByDepartment' },
          { header: 'Target Year', key: 'targetYear' },
          { header: 'Semester', key: 'semester' },
          { header: 'Total Capacity', key: 'totalSeats' },
          { header: 'Seats Filled', key: 'seatsFilled' },
          { header: 'Status', key: 'isActive', transform: (v) => (v ? 'Active' : 'Inactive') },
        ],
      })
      toast.success('Electives overview downloaded')
    } catch (err) {
      toast.error('Failed to export electives')
    } finally {
      setExportingElectives(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-64 bg-gray-200 rounded animate-pulse" />
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-3 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, idx) => (
            <SkeletonStat key={idx} />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Banner */}
      <div className="bg-gradient-to-r from-blue-700 via-teal-700 to-teal-900 rounded-2xl p-6 sm:p-8 text-white shadow-lg">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 backdrop-blur-md rounded-full text-xs font-semibold tracking-wide text-blue-100 mb-2">
              <span>🏛️ Open Elective Administrator</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Open Elective Dashboard
            </h1>
            <p className="mt-1 text-sm sm:text-base text-blue-200">
              Manage upper-year (SY/TY) Open Electives, departmental quotas, and senior student allotments
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleExportStudents}
              disabled={exportingStudents}
              className="bg-white/20 hover:bg-white/30 text-white border-0"
            >
              {exportingStudents ? 'Exporting...' : '📥 Export Students'}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleExportElectives}
              disabled={exportingElectives}
              className="bg-white/20 hover:bg-white/30 text-white border-0"
            >
              {exportingElectives ? 'Exporting...' : '📊 Export Electives'}
            </Button>
          </div>
        </div>
      </div>

      {/* KPI Stats */}
      {stats && (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-3 lg:grid-cols-5">
          <StatCard title="Senior Students" value={stats.totalStudents} color="teal" />
          <StatCard title="Verified Students" value={stats.verifiedStudents} color="green" />
          <StatCard title="Allocated Students" value={stats.allocatedStudents} color="blue" />
          <StatCard title="Active Electives" value={stats.activeElectives} color="accent" />
          <StatCard title="Total Electives" value={stats.totalElectives} color="gray" />
        </div>
      )}

      {/* Quick Links Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
        <Link
          href="/admin/electives"
          className="group bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-teal-300 transition-all"
        >
          <div className="w-10 h-10 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center font-bold text-lg mb-3 group-hover:scale-105 transition-transform">
            📚
          </div>
          <h3 className="text-base font-bold text-gray-900 group-hover:text-teal-600 transition-colors">
            Manage Open Electives
          </h3>
          <p className="text-xs text-gray-500 mt-1">
            Create, update capacity, and configure divisions for SY/TY courses
          </p>
        </Link>

        <Link
          href="/admin/students"
          className="group bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-teal-300 transition-all"
        >
          <div className="w-10 h-10 rounded-lg bg-green-50 text-green-600 flex items-center justify-center font-bold text-lg mb-3 group-hover:scale-105 transition-transform">
            👥
          </div>
          <h3 className="text-base font-bold text-gray-900 group-hover:text-green-600 transition-colors">
            Student Roster
          </h3>
          <p className="text-xs text-gray-500 mt-1">
            Review allocated upper-year students and search by PRN or department
          </p>
        </Link>

        <Link
          href="/admin/term-config"
          className="group bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-teal-300 transition-all"
        >
          <div className="w-10 h-10 rounded-lg bg-accent-50 text-accent-600 flex items-center justify-center font-bold text-lg mb-3 group-hover:scale-105 transition-transform">
            ⏱️
          </div>
          <h3 className="text-base font-bold text-gray-900 group-hover:text-accent-600 transition-colors">
            Registration Windows
          </h3>
          <p className="text-xs text-gray-500 mt-1">
            Configure Open Elective scheduling and registration periods
          </p>
        </Link>
      </div>
    </div>
  )
}

function StatCard({ title, value, color }: { title: string; value: number; color: string }) {
  const colorMap: Record<string, string> = {
    teal: 'bg-teal-50 text-teal-700 border-teal-200',
    green: 'bg-green-50 text-green-700 border-green-200',
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
    accent: 'bg-accent-50 text-accent-700 border-accent-200',
    gray: 'bg-gray-50 text-gray-700 border-gray-200',
  }

  return (
    <div className={`rounded-xl p-5 border ${colorMap[color] || colorMap.gray} shadow-sm`}>
      <p className="text-xs font-semibold opacity-75 uppercase tracking-wider">{title}</p>
      <p className="text-2xl font-bold mt-2">{value ?? 0}</p>
    </div>
  )
}
