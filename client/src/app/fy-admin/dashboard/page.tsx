'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import api from '@/lib/api'
import { Button } from '@/components/ui/Button'
import toast from 'react-hot-toast'

export default function FYAdminDashboardPage() {
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      setLoading(true)
      const res = await api.get('/api/fy-admin/stats')
      setStats(res.data.data)
    } catch (err) {
      toast.error('Failed to load FY dashboard statistics')
    } finally {
      setLoading(false)
    }
  }

  const handleExportCSV = async () => {
    try {
      const res = await api.get('/api/fy-admin/export', { responseType: 'blob' })
      const url = window.URL.createObjectURL(new Blob([res.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `FY_Club_Allotment_${new Date().toISOString().split('T')[0]}.csv`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      toast.success('CSV export completed')
    } catch (err) {
      toast.error('Export failed')
    }
  }

  const handleExportZIP = async () => {
    try {
      const res = await api.get('/api/fy-admin/export-all', { responseType: 'blob' })
      const url = window.URL.createObjectURL(new Blob([res.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `FY_Department_Clubs_${new Date().toISOString().split('T')[0]}.zip`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      toast.success('Department-wise ZIP export completed')
    } catch (err) {
      toast.error('ZIP export failed')
    }
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-indigo-700 via-indigo-800 to-purple-800 rounded-2xl p-6 sm:p-8 text-white shadow-lg">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 backdrop-blur-md rounded-full text-xs font-semibold tracking-wide text-indigo-100 mb-2">
              <span>🛡️ Dedicated Admin 2 Portal</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              First-Year Club Allocation Portal
            </h1>
            <p className="mt-1 text-sm sm:text-base text-indigo-200">
              Manage First-Year Co-Curricular & Extra-Curricular Clubs, student registrations, and division alloting
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={handleExportCSV} variant="secondary" size="sm" className="bg-white/20 hover:bg-white/30 text-white border-0">
              📥 Export All CSV
            </Button>
            <Button onClick={handleExportZIP} variant="secondary" size="sm" className="bg-white/20 hover:bg-white/30 text-white border-0">
              📦 Export Dept ZIP
            </Button>
          </div>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex justify-between items-center text-sm font-medium text-gray-500">
            <span>Total FY Students</span>
            <span className="text-lg">👥</span>
          </div>
          <div className="mt-2 text-3xl font-bold text-gray-900">
            {loading ? '...' : stats?.totalFYStudents ?? 0}
          </div>
          <div className="mt-1 text-xs text-emerald-600 font-medium">
            {stats?.verifiedFYStudents ?? 0} verified accounts
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex justify-between items-center text-sm font-medium text-gray-500">
            <span>Co-Curricular Allocated</span>
            <span className="text-lg">🎓</span>
          </div>
          <div className="mt-2 text-3xl font-bold text-indigo-600">
            {loading ? '...' : stats?.coCurricularAllocated ?? 0}
          </div>
          <div className="mt-1 text-xs text-gray-500">
            {stats?.coCurricularClubs ?? 0} active clubs
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex justify-between items-center text-sm font-medium text-gray-500">
            <span>Extra-Curricular Allocated</span>
            <span className="text-lg">🎨</span>
          </div>
          <div className="mt-2 text-3xl font-bold text-purple-600">
            {loading ? '...' : stats?.extraCurricularAllocated ?? 0}
          </div>
          <div className="mt-1 text-xs text-gray-500">
            {stats?.extraCurricularClubs ?? 0} active clubs
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex justify-between items-center text-sm font-medium text-gray-500">
            <span>Fully Allocated</span>
            <span className="text-lg">✨</span>
          </div>
          <div className="mt-2 text-3xl font-bold text-emerald-600">
            {loading ? '...' : stats?.fullyAllocated ?? 0}
          </div>
          <div className="mt-1 text-xs text-gray-500">
            Both categories completed
          </div>
        </div>
      </div>

      {/* Quick Navigation Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link
          href="/fy-admin/clubs"
          className="group bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-indigo-400 transition-all"
        >
          <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center text-xl mb-3 group-hover:scale-110 transition-transform">
            🏛️
          </div>
          <h3 className="text-base font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors">
            Club Management
          </h3>
          <p className="mt-1 text-xs text-gray-500">
            Add, edit, or configure Co-Curricular & Extra-Curricular clubs and divisions
          </p>
        </Link>

        <Link
          href="/fy-admin/students"
          className="group bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-indigo-400 transition-all"
        >
          <div className="w-10 h-10 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center text-xl mb-3 group-hover:scale-110 transition-transform">
            📋
          </div>
          <h3 className="text-base font-semibold text-gray-900 group-hover:text-purple-600 transition-colors">
            FY Student Directory
          </h3>
          <p className="mt-1 text-xs text-gray-500">
            View all Year-1 student profiles and club allocation status
          </p>
        </Link>

        <Link
          href="/fy-admin/branches"
          className="group bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-indigo-400 transition-all"
        >
          <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center text-xl mb-3 group-hover:scale-110 transition-transform">
            🏢
          </div>
          <h3 className="text-base font-semibold text-gray-900 group-hover:text-emerald-600 transition-colors">
            FY Branch Config
          </h3>
          <p className="mt-1 text-xs text-gray-500">
            Manage authorized departments and branches for First-Year
          </p>
        </Link>

        <Link
          href="/fy-admin/term-config"
          className="group bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-indigo-400 transition-all"
        >
          <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center text-xl mb-3 group-hover:scale-110 transition-transform">
            ⏰
          </div>
          <h3 className="text-base font-semibold text-gray-900 group-hover:text-amber-600 transition-colors">
            Registration Windows
          </h3>
          <p className="mt-1 text-xs text-gray-500">
            Set opening and closing schedules for FY club selection
          </p>
        </Link>
      </div>
    </div>
  )
}
