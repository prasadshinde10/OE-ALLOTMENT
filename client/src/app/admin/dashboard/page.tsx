'use client'
import { useState, useEffect } from 'react'
import api from '@/lib/api'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalAllocated: 0,
    activeElectives: 0
  })
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [studentsRes, allocatedRes, electivesRes, logsRes] = await Promise.all([
          api.get('/api/students?limit=1'),
          api.get('/api/students?limit=1&isAllocated=true'), // Assuming backend supports this or we estimate
          api.get('/api/electives'),
          api.get('/api/admin/audit-log?limit=5')
        ])

        setStats({
          totalStudents: studentsRes.data.pagination.total || 0,
          totalAllocated: allocatedRes.data.pagination.total || 0, // Fallback if accurate param not supported
          activeElectives: electivesRes.data.data.length
        })
        setLogs(logsRes.data.data || [])
      } catch (err) {
        console.error('Failed to load dashboard stats', err)
      } finally {
        setLoading(false)
      }
    }
    fetchDashboardData()
  }, [])

  if (loading) return <div className="flex justify-center p-12"><LoadingSpinner /></div>

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <dt className="text-sm font-medium text-gray-500 truncate">Total Students</dt>
            <dd className="mt-1 text-3xl font-semibold text-indigo-600">{stats.totalStudents}</dd>
          </div>
        </div>
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <dt className="text-sm font-medium text-gray-500 truncate">Active Electives</dt>
            <dd className="mt-1 text-3xl font-semibold text-green-600">{stats.activeElectives}</dd>
          </div>
        </div>
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <dt className="text-sm font-medium text-gray-500 truncate">Total Allocations</dt>
            <dd className="mt-1 text-3xl font-semibold text-yellow-600">{stats.totalAllocated}</dd>
          </div>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 border-b border-gray-200 sm:px-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">Recent Audit Logs</h3>
        </div>
        <ul className="divide-y divide-gray-200">
          {logs.map((log: any) => (
            <li key={log._id} className="p-4 sm:px-6 hover:bg-gray-50">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-indigo-600 truncate">{log.action}</p>
                <div className="ml-2 flex-shrink-0 flex">
                  <p className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                    {log.actorRole}
                  </p>
                </div>
              </div>
              <div className="mt-2 sm:flex sm:justify-between">
                <div className="sm:flex">
                  <p className="flex items-center text-sm text-gray-500">
                    Target: {log.targetType} ({log.targetId})
                  </p>
                </div>
                <div className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0">
                  <p>{new Date(log.timestamp).toLocaleString()}</p>
                </div>
              </div>
            </li>
          ))}
          {logs.length === 0 && <li className="p-4 text-center text-gray-500">No recent activity</li>}
        </ul>
      </div>
    </div>
  )
}
