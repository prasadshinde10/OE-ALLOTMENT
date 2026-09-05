'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import api from '@/lib/api'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import toast from 'react-hot-toast'
import { Student } from '@/types'

const COMMON_FY_BRANCH_PRESETS = [
  'FY-CSE',
  'FY-CSD',
  'FY-AI&DS',
  'FY-MECH',
  'FY-CIVIL',
  'FY-ENTC',
]

export default function ClubAdminDashboardPage() {
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  // Dynamic Branch Management state
  const [branches, setBranches] = useState<any[]>([])
  const [loadingBranches, setLoadingBranches] = useState(true)
  const [newBranchName, setNewBranchName] = useState('')
  const [addingBranch, setAddingBranch] = useState(false)
  const [branchSearch, setBranchSearch] = useState('')
  const [editingBranch, setEditingBranch] = useState<{ _id: string; name: string } | null>(null)
  const [updatingBranch, setUpdatingBranch] = useState(false)

  // Student Roster & Reallocation state
  const [recentStudents, setRecentStudents] = useState<Student[]>([])
  const [loadingStudents, setLoadingStudents] = useState(true)
  const [studentSearch, setStudentSearch] = useState('')

  // Reallocation Modal state
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

  useEffect(() => {
    fetchStats()
    fetchBranches()
    fetchRecentStudents()
    fetchClubs()
  }, [])

  const fetchStats = async () => {
    try {
      setLoading(true)
      const res = await api.get('/api/fy-admin/stats')
      setStats(res.data.data)
    } catch (err) {
      toast.error('Failed to load FY statistics')
    } finally {
      setLoading(false)
    }
  }

  const fetchBranches = async () => {
    try {
      setLoadingBranches(true)
      const res = await api.get('/api/fy-branches')
      setBranches(res.data.data || [])
    } catch (err) {
      setBranches([])
    } finally {
      setLoadingBranches(false)
    }
  }

  const fetchClubs = async () => {
    try {
      const res = await api.get('/api/clubs?year=1')
      setAvailableClubs(res.data.data || [])
    } catch (err) {
      setAvailableClubs([])
    }
  }

  const fetchRecentStudents = async () => {
    try {
      setLoadingStudents(true)
      const res = await api.get('/api/fy-admin/students?limit=10')
      setRecentStudents(res.data.data || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoadingStudents(false)
    }
  }

  const handleAddBranch = async (e?: React.FormEvent, presetName?: string) => {
    if (e) e.preventDefault()
    const nameToAdd = (presetName || newBranchName).trim()
    if (!nameToAdd) return
    try {
      setAddingBranch(true)
      await api.post('/api/fy-branches', { name: nameToAdd })
      toast.success(`Branch "${nameToAdd}" registered successfully`)
      if (!presetName) setNewBranchName('')
      fetchBranches()
    } catch (err: any) {
      if (err.response?.status === 409) {
        toast.error(`Branch "${nameToAdd}" already exists for First-Year`)
      } else {
        toast.error(err.response?.data?.message || 'Failed to add branch')
      }
    } finally {
      setAddingBranch(false)
    }
  }

  const handleUpdateBranch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingBranch || !editingBranch.name.trim()) return
    try {
      setUpdatingBranch(true)
      await api.put(`/api/fy-branches/${editingBranch._id}`, { name: editingBranch.name.trim() })
      toast.success('Branch renamed successfully')
      setEditingBranch(null)
      fetchBranches()
    } catch (err: any) {
      if (err.response?.status === 409) {
        toast.error('Another branch already has this name for First-Year')
      } else {
        toast.error(err.response?.data?.message || 'Failed to update branch')
      }
    } finally {
      setUpdatingBranch(false)
    }
  }

  const handleDeleteBranch = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to remove First-Year branch "${name}"?`)) return
    try {
      await api.delete(`/api/fy-branches/${id}`)
      toast.success(`Branch "${name}" removed`)
      fetchBranches()
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to remove branch')
    }
  }

  const handleOpenReallocate = (student: Student, defaultCategory: 'co-curricular' | 'extra-curricular' = 'co-curricular') => {
    setReallocateModal({
      isOpen: true,
      student,
      category: defaultCategory,
      newClubId: '',
    })
  }

  const handleExecuteReallocate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!reallocateModal.student || !reallocateModal.newClubId) {
      toast.error('Please select a target club')
      return
    }

    try {
      setReallocating(true)
      await api.post('/api/fy-admin/reallocate', {
        studentId: reallocateModal.student._id,
        newClubId: reallocateModal.newClubId,
      })
      toast.success('Student club reallocated successfully')
      setReallocateModal({ isOpen: false, student: null, category: 'co-curricular', newClubId: '' })
      fetchRecentStudents()
      fetchStats()
      fetchClubs()
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Reallocation failed')
    } finally {
      setReallocating(false)
    }
  }

  const handleExportCSV = async () => {
    try {
      const res = await api.get('/api/fy-admin/export', { responseType: 'blob' })
      const url = window.URL.createObjectURL(new Blob([res.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `FY_Clubs_Allotment_${new Date().toISOString().split('T')[0]}.csv`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      toast.success('CSV export downloaded')
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
      toast.success('Department ZIP export downloaded')
    } catch (err) {
      toast.error('ZIP export failed')
    }
  }

  const filteredBranches = branches.filter((b) =>
    (b.name || '').toLowerCase().includes(branchSearch.toLowerCase().trim())
  )

  const filteredClubOptions = availableClubs.filter(
    (c) => c.category === reallocateModal.category && c.isActive
  )

  const filteredStudents = recentStudents.filter((s) => {
    if (!studentSearch.trim()) return true
    const q = studentSearch.toLowerCase()
    const name = `${s.firstName} ${s.middleName || ''} ${s.lastName}`.toLowerCase()
    return name.includes(q) || s.instituteEmail.toLowerCase().includes(q) || (s.rollNumber || '').toLowerCase().includes(q)
  })

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-indigo-700 via-purple-700 to-purple-900 rounded-2xl p-6 sm:p-8 text-white shadow-lg">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 backdrop-blur-md rounded-full text-xs font-semibold tracking-wide text-purple-100 mb-2">
              <span>🎯 Equal-Level Administrator</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              First-Year Club Dashboard
            </h1>
            <p className="mt-1 text-sm sm:text-base text-purple-200">
              Manage First-Year Co-Curricular & Extra-Curricular Clubs, dynamic branches, and student re-allocations
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleExportCSV}
              className="bg-white/20 hover:bg-white/30 text-white border-0"
            >
              📥 Export All CSV
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleExportZIP}
              className="bg-white/20 hover:bg-white/30 text-white border-0"
            >
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
            Across {stats?.coCurricularClubs ?? 0} active clubs
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
            Across {stats?.extraCurricularClubs ?? 0} active clubs
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex justify-between items-center text-sm font-medium text-gray-500">
            <span>Fully Allocated (Both)</span>
            <span className="text-lg">✅</span>
          </div>
          <div className="mt-2 text-3xl font-bold text-emerald-600">
            {loading ? '...' : stats?.fullyAllocated ?? 0}
          </div>
          <div className="mt-1 text-xs text-emerald-600 font-medium">
            100% complete allotments
          </div>
        </div>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link
          href="/fy-admin/clubs"
          className="group bg-white p-5 rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-indigo-400 transition-all flex items-center gap-4"
        >
          <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-xl group-hover:scale-110 transition-transform">
            🎪
          </div>
          <div>
            <h3 className="font-bold text-gray-900 group-hover:text-indigo-600 transition-colors text-sm">
              Club Management
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Add clubs, coordinators, and configure divisions
            </p>
          </div>
        </Link>

        <Link
          href="/fy-admin/students"
          className="group bg-white p-5 rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-purple-400 transition-all flex items-center gap-4"
        >
          <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold text-xl group-hover:scale-110 transition-transform">
            📋
          </div>
          <div>
            <h3 className="font-bold text-gray-900 group-hover:text-purple-600 transition-colors text-sm">
              Full Student Roster
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Search, filter, and review all FY student allocations
            </p>
          </div>
        </Link>

        <Link
          href="/fy-admin/term-config"
          className="group bg-white p-5 rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-emerald-400 transition-all flex items-center gap-4"
        >
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-xl group-hover:scale-110 transition-transform">
            ⏰
          </div>
          <div>
            <h3 className="font-bold text-gray-900 group-hover:text-emerald-600 transition-colors text-sm">
              Registration Windows
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Schedule Sem-1 and Sem-2 registration dates
            </p>
          </div>
        </Link>
      </div>

      {/* Dynamic First-Year Branch Management Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-5">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-gray-100 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl">🌿</span>
              <h2 className="text-lg font-bold text-gray-900">
                Dynamic First-Year Branch Management
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100">
                {branches.length} Active {branches.length === 1 ? 'Branch' : 'Branches'}
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Add, edit, rename, and delete active First-Year branches/sections (e.g. FY-CSE, FY-CSD, FY-AI&DS, FY-MECH). Automatically syncs with First-Year student registration and profile drop-down menus.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={fetchBranches}
            disabled={loadingBranches}
            className="text-xs shrink-0"
          >
            {loadingBranches ? 'Refreshing...' : '🔄 Refresh Branches'}
          </Button>
        </div>

        {/* Quick Suggestion Presets */}
        {COMMON_FY_BRANCH_PRESETS.some((preset) => !branches.some((b) => b.name?.toLowerCase() === preset.toLowerCase())) && (
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600">
              <span>⚡ Quick Add Presets:</span>
              <span className="text-[11px] font-normal text-slate-400">Click to instantly add standard First-Year branches</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {COMMON_FY_BRANCH_PRESETS.filter(
                (preset) => !branches.some((b) => b.name?.toLowerCase() === preset.toLowerCase())
              ).map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => handleAddBranch(undefined, preset)}
                  disabled={addingBranch}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-white hover:bg-indigo-50 border border-slate-200 hover:border-indigo-300 text-slate-700 hover:text-indigo-600 transition-colors shadow-sm"
                >
                  <span className="text-indigo-500 font-bold">+</span>
                  <span>{preset}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Add Branch Form & Search Bar */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
          <form onSubmit={(e) => handleAddBranch(e)} className="lg:col-span-8 flex flex-col sm:flex-row gap-2">
            <Input
              placeholder="Enter branch or section name (e.g. FY-CSE, FY-CSD, FY-AI&DS)..."
              value={newBranchName}
              onChange={(e) => setNewBranchName(e.target.value)}
              className="flex-1"
            />
            <Button
              type="submit"
              disabled={addingBranch || !newBranchName.trim()}
              className="bg-indigo-600 hover:bg-indigo-700 text-white shrink-0"
            >
              {addingBranch ? 'Adding...' : '+ Add FY Branch'}
            </Button>
          </form>
          <div className="lg:col-span-4">
            <Input
              placeholder="Search active branches..."
              value={branchSearch}
              onChange={(e) => setBranchSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Dynamic Branch Table / Cards List */}
        <div className="overflow-x-auto border border-gray-200 rounded-xl">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2.5 text-left font-semibold text-gray-600 text-xs uppercase tracking-wider">
                  Branch / Section Name
                </th>
                <th className="px-4 py-2.5 text-left font-semibold text-gray-600 text-xs uppercase tracking-wider">
                  Target Year Scope
                </th>
                <th className="px-4 py-2.5 text-left font-semibold text-gray-600 text-xs uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-2.5 text-right font-semibold text-gray-600 text-xs uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {loadingBranches ? (
                <tr>
                  <td colSpan={4} className="text-center py-6 text-gray-400 text-xs">
                    Loading First-Year branches...
                  </td>
                </tr>
              ) : filteredBranches.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center py-8 text-gray-400">
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-gray-500">
                        {branchSearch ? 'No branches match your search query.' : 'No First-Year branches configured yet.'}
                      </p>
                      {!branchSearch && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            COMMON_FY_BRANCH_PRESETS.forEach((preset) => handleAddBranch(undefined, preset))
                          }}
                        >
                          ⚡ Initialize Standard FY Branches
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredBranches.map((b) => (
                  <tr key={b._id || b.name} className="hover:bg-gray-50/80 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 font-semibold text-gray-900">
                        <span className="w-6 h-6 rounded bg-indigo-50 text-indigo-600 flex items-center justify-center text-xs font-bold">
                          🏛️
                        </span>
                        <span>{b.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-indigo-50 text-indigo-700">
                        1st Year (FY)
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                        Active
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setEditingBranch({ _id: b._id, name: b.name })}
                          className="text-xs h-7 px-2.5 hover:border-indigo-400 hover:text-indigo-600"
                        >
                          ✏️ Edit
                        </Button>
                        <Button
                          type="button"
                          variant="danger"
                          size="sm"
                          onClick={() => handleDeleteBranch(b._id, b.name)}
                          className="text-xs h-7 px-2.5"
                        >
                          🗑️ Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Student Roster & Manual Re-allocation Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <span>🔄</span> Student Allocations & Manual Re-allocation
            </h2>
            <p className="text-xs text-gray-500">
              Directly override, swap, or reassign a First-Year student's allocated club
            </p>
          </div>
          <div className="w-full sm:w-64">
            <Input
              placeholder="Search by name, email, roll..."
              value={studentSearch}
              onChange={(e) => setStudentSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-gray-600 text-xs uppercase">Roll No</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600 text-xs uppercase">Student Details</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600 text-xs uppercase">Department</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600 text-xs uppercase">Co-Curricular Club</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600 text-xs uppercase">Extra-Curricular Club</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {loadingStudents ? (
                <tr>
                  <td colSpan={5} className="text-center py-6 text-gray-400">Loading student roster...</td>
                </tr>
              ) : filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-6 text-gray-400">No students match your query.</td>
                </tr>
              ) : (
                filteredStudents.map((s) => (
                  <tr key={s._id} className="hover:bg-gray-50/80 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs font-semibold text-gray-700">
                      {s.rollNumber || 'N/A'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-gray-900">
                        {`${s.firstName} ${s.middleName || ''} ${s.lastName}`.replace(/\s+/g, ' ').trim()}
                      </div>
                      <div className="text-xs text-indigo-600 font-mono">{s.instituteEmail}</div>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600">{s.branch}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-between gap-2">
                        {s.allocatedCoCurricularClubName ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-50 text-indigo-700">
                            {s.allocatedCoCurricularClubName}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400 italic">None</span>
                        )}
                        <button
                          type="button"
                          onClick={() => handleOpenReallocate(s, 'co-curricular')}
                          className="text-[11px] text-indigo-600 hover:text-indigo-800 font-semibold underline"
                        >
                          {s.allocatedCoCurricularClubName ? 'Reassign' : 'Assign'}
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-between gap-2">
                        {s.allocatedExtraCurricularClubName ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-50 text-purple-700">
                            {s.allocatedExtraCurricularClubName}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400 italic">None</span>
                        )}
                        <button
                          type="button"
                          onClick={() => handleOpenReallocate(s, 'extra-curricular')}
                          className="text-[11px] text-purple-600 hover:text-purple-800 font-semibold underline"
                        >
                          {s.allocatedExtraCurricularClubName ? 'Reassign' : 'Assign'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="text-right pt-2">
          <Link
            href="/fy-admin/students"
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 underline"
          >
            View all FY students in directory →
          </Link>
        </div>
      </div>

      {/* Reallocation Override Modal */}
      {reallocateModal.isOpen && reallocateModal.student && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-fadeIn">
            <div className="flex justify-between items-start border-b pb-3">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Manual Club Re-allocation</h3>
                <p className="text-xs text-gray-500">
                  Override club allocation for {reallocateModal.student.firstName} {reallocateModal.student.lastName} ({reallocateModal.student.rollNumber || reallocateModal.student.instituteEmail})
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

      {/* Edit Branch Modal */}
      {editingBranch && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <span>✏️</span> Edit First-Year Branch
              </h3>
              <button
                type="button"
                onClick={() => setEditingBranch(null)}
                className="text-gray-400 hover:text-gray-600 font-bold text-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdateBranch} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1">
                  Branch / Section Name
                </label>
                <Input
                  value={editingBranch.name}
                  onChange={(e) => setEditingBranch({ ...editingBranch, name: e.target.value })}
                  placeholder="e.g. FY-CSE or FY-CSD"
                  required
                />
                <p className="text-[11px] text-gray-400 mt-1">
                  Renaming will automatically reflect across all First-Year student registration and profile drop-downs.
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setEditingBranch(null)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={updatingBranch || !editingBranch.name.trim()}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white"
                >
                  {updatingBranch ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
