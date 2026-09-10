'use client'

import { useState, useEffect } from 'react'
import api from '@/lib/api'
import { DataTable } from '@/components/ui/DataTable'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import toast from 'react-hot-toast'

const COMMON_FY_BRANCH_PRESETS = [
  'FY-CSE',
  'FY-CSD',
  'FY-AI&DS',
  'FY-MECH',
  'FY-CIVIL',
  'FY-ENTC',
]

export default function FYAdminBranchesPage() {
  const [branches, setBranches] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [name, setName] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Edit Modal State
  const [editingBranch, setEditingBranch] = useState<{ _id: string; name: string } | null>(null)
  const [editName, setEditName] = useState('')
  const [updating, setUpdating] = useState(false)

  useEffect(() => {
    fetchBranches()
  }, [])

  const fetchBranches = async () => {
    try {
      setLoading(true)
      const res = await api.get('/api/fy-branches')
      setBranches(res.data.data || [])
    } catch (err) {
      toast.error('Failed to load FY branches')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    try {
      setSubmitting(true)
      await api.post('/api/fy-branches', { name: name.trim() })
      toast.success('First-Year branch registered successfully')
      setIsModalOpen(false)
      setName('')
      fetchBranches()
    } catch (err: any) {
      if (err.response?.status === 409) {
        toast.error('Branch already registered for First-Year')
      } else {
        toast.error(err.response?.data?.message || 'Error creating branch')
      }
    } finally {
      setSubmitting(false)
    }
  }

  const handleQuickAdd = async (preset: string) => {
    try {
      await api.post('/api/fy-branches', { name: preset })
      toast.success(`Branch "${preset}" added`)
      fetchBranches()
    } catch (err: any) {
      if (err.response?.status === 409) {
        toast.error(`Branch "${preset}" already registered`)
      } else {
        toast.error('Error creating branch')
      }
    }
  }

  const handleOpenEdit = (branch: any) => {
    setEditingBranch(branch)
    setEditName(branch.name)
  }

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingBranch || !editName.trim()) return
    try {
      setUpdating(true)
      await api.put(`/api/fy-branches/${editingBranch._id}`, { name: editName.trim() })
      toast.success('Branch renamed successfully')
      setEditingBranch(null)
      fetchBranches()
    } catch (err: any) {
      if (err.response?.status === 409) {
        toast.error('Another branch with this name already exists')
      } else {
        toast.error(err.response?.data?.message || 'Error updating branch')
      }
    } finally {
      setUpdating(false)
    }
  }

  const handleDelete = async (id: string, branchName: string) => {
    if (!confirm(`Are you sure you want to remove "${branchName}" from First-Year?`)) return
    try {
      await api.delete(`/api/fy-branches/${id}`)
      toast.success(`Branch "${branchName}" deleted`)
      fetchBranches()
    } catch (err) {
      toast.error('Error deleting branch')
    }
  }

  const columns = [
    {
      header: 'Department / Branch Name',
      accessor: (row: any) => (
        <div className="flex items-center gap-2 font-semibold text-gray-900">
          <span className="w-6 h-6 rounded bg-teal-50 text-teal-600 flex items-center justify-center text-xs font-bold">
            🏛️
          </span>
          <span>{row.name}</span>
        </div>
      ),
    },
    {
      header: 'Academic Year Scope',
      accessor: () => (
        <span className="text-xs font-semibold px-2.5 py-0.5 bg-teal-50 text-teal-700 rounded-full border border-teal-100">
          1st Year (FY)
        </span>
      ),
    },
    {
      header: 'Status',
      accessor: () => (
        <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
          Active
        </span>
      ),
    },
    {
      header: 'Actions',
      accessor: (row: any) => (
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => handleOpenEdit(row)}>
            ✏️ Edit
          </Button>
          <Button size="sm" variant="danger" onClick={() => handleDelete(row._id, row.name)}>
            🗑️ Delete
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Manage First-Year Branches</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Configure dynamic academic departments & sections for First-Year club allotment ({branches.length} active)
          </p>
        </div>
        <Button onClick={() => setIsModalOpen(true)}>+ Add First-Year Branch</Button>
      </div>

      {/* Quick Suggestions Bar */}
      {COMMON_FY_BRANCH_PRESETS.some((preset) => !branches.some((b) => b.name?.toLowerCase() === preset.toLowerCase())) && (
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 space-y-2">
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
                onClick={() => handleQuickAdd(preset)}
                className="inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-medium bg-white hover:bg-teal-50 border border-slate-200 hover:border-teal-300 text-slate-700 hover:text-teal-600 transition-colors shadow-sm"
              >
                <span className="text-teal-600 font-bold">+</span>
                <span>{preset}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <DataTable columns={columns} data={branches} isLoading={loading} />
      </div>

      {/* Add Branch Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Add First-Year Branch">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Branch / Section Name
            </label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. FY-CSE, FY-CSD, FY-AI&DS, or FY-MECH"
              required
            />
            <p className="text-xs text-gray-400 mt-1">
              This branch will immediately appear on First-Year student registration and profile selection menus.
            </p>
          </div>

          <div className="flex justify-end gap-2 mt-4">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting || !name.trim()}>
              {submitting ? 'Registering...' : 'Add Branch'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Branch Modal */}
      <Modal isOpen={!!editingBranch} onClose={() => setEditingBranch(null)} title="Edit First-Year Branch">
        <form onSubmit={handleUpdate} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Branch / Section Name
            </label>
            <Input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              placeholder="e.g. FY-CSE or FY-CSD"
              required
            />
            <p className="text-xs text-gray-400 mt-1">
              Renaming will update the branch for all First-Year students registered under it.
            </p>
          </div>

          <div className="flex justify-end gap-2 mt-4">
            <Button type="button" variant="outline" onClick={() => setEditingBranch(null)}>
              Cancel
            </Button>
            <Button type="submit" disabled={updating || !editName.trim()}>
              {updating ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
