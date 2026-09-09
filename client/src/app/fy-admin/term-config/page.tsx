'use client'

import { useState, useEffect } from 'react'
import api from '@/lib/api'
import { DataTable } from '@/components/ui/DataTable'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import toast from 'react-hot-toast'
import { TermConfig } from '@/types'

export default function FYAdminTermConfigPage() {
  const [configs, setConfigs] = useState<TermConfig[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  // Dedicated Card State: Student Registration Phase Settings
  const [regPhaseActive, setRegPhaseActive] = useState<boolean>(true)
  const [regStartDate, setRegStartDate] = useState<string>('')
  const [regEndDate, setRegEndDate] = useState<string>('')
  const [savingPhase, setSavingPhase] = useState<boolean>(false)

  // Modal Form Data
  const [formData, setFormData] = useState({
    term: 'Sem-1',
    registrationOpensAt: '',
    registrationClosesAt: '',
    isActive: true,
    isRegistrationActive: true,
    registrationStartDate: '',
    registrationEndDate: '',
  })

  useEffect(() => {
    fetchConfigs()
  }, [])

  const fetchConfigs = async () => {
    try {
      setLoading(true)
      const res = await api.get('/api/fy-admin/term-configs')
      const data: TermConfig[] = res.data.data || []
      setConfigs(data)

      // Sync dedicated card with active term config
      const active = data.find((c) => c.isActive) || data[0]
      if (active) {
        setRegPhaseActive(active.isRegistrationActive !== false)
        setRegStartDate(
          active.registrationStartDate
            ? new Date(active.registrationStartDate).toISOString().slice(0, 16)
            : ''
        )
        setRegEndDate(
          active.registrationEndDate
            ? new Date(active.registrationEndDate).toISOString().slice(0, 16)
            : ''
        )
      }
    } catch (err) {
      toast.error('Failed to load FY term configs')
    } finally {
      setLoading(false)
    }
  }

  // Save Dedicated Registration Phase Card
  const handleSaveRegistrationPhase = async () => {
    const active = configs.find((c) => c.isActive) || configs[0]
    if (!active) {
      toast.error('No active term configuration found. Please create one first.')
      return
    }

    try {
      setSavingPhase(true)
      const payload = {
        isRegistrationActive: regPhaseActive,
        registrationStartDate: regStartDate ? new Date(regStartDate).toISOString() : null,
        registrationEndDate: regEndDate ? new Date(regEndDate).toISOString() : null,
      }

      await api.put(`/api/fy-admin/term-configs/${active._id}`, payload)
      toast.success('Student Registration Phase updated successfully!')
      fetchConfigs()
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update registration phase')
    } finally {
      setSavingPhase(false)
    }
  }

  const handleOpenModal = (config?: TermConfig) => {
    if (config) {
      setEditingId(config._id)
      setFormData({
        term: config.term,
        registrationOpensAt: new Date(config.registrationOpensAt).toISOString().slice(0, 16),
        registrationClosesAt: new Date(config.registrationClosesAt).toISOString().slice(0, 16),
        isActive: config.isActive,
        isRegistrationActive: config.isRegistrationActive !== false,
        registrationStartDate: config.registrationStartDate
          ? new Date(config.registrationStartDate).toISOString().slice(0, 16)
          : '',
        registrationEndDate: config.registrationEndDate
          ? new Date(config.registrationEndDate).toISOString().slice(0, 16)
          : '',
      })
    } else {
      setEditingId(null)
      const now = new Date()
      const inSevenDays = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      setFormData({
        term: 'Sem-1',
        registrationOpensAt: now.toISOString().slice(0, 16),
        registrationClosesAt: inSevenDays.toISOString().slice(0, 16),
        isActive: true,
        isRegistrationActive: true,
        registrationStartDate: now.toISOString().slice(0, 16),
        registrationEndDate: inSevenDays.toISOString().slice(0, 16),
      })
    }
    setIsModalOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const payload = {
        ...formData,
        registrationStartDate: formData.registrationStartDate
          ? new Date(formData.registrationStartDate).toISOString()
          : null,
        registrationEndDate: formData.registrationEndDate
          ? new Date(formData.registrationEndDate).toISOString()
          : null,
      }

      if (editingId) {
        await api.put(`/api/fy-admin/term-configs/${editingId}`, payload)
        toast.success('Term window updated')
      } else {
        await api.post('/api/fy-admin/term-configs', payload)
        toast.success('Term window configured')
      }
      setIsModalOpen(false)
      fetchConfigs()
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error saving term config')
    }
  }

  const activeConfig = configs.find((c) => c.isActive) || configs[0]

  // Status computation for dedicated card badge
  const getPhaseStatusBadge = () => {
    if (!regPhaseActive) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-100 text-red-800 rounded-full text-xs font-bold">
          🔒 Locked / Disabled
        </span>
      )
    }
    if (!regStartDate && !regEndDate) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full text-xs font-bold">
          🟢 Live & Unrestricted
        </span>
      )
    }
    const now = Date.now()
    const start = regStartDate ? new Date(regStartDate).getTime() : 0
    const end = regEndDate ? new Date(regEndDate).getTime() : Infinity

    if (now < start) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-100 text-amber-800 rounded-full text-xs font-bold">
          ⏳ Scheduled (Opens {new Date(regStartDate).toLocaleDateString()})
        </span>
      )
    }
    if (now > end) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-100 text-red-800 rounded-full text-xs font-bold">
          🔒 Closed (Ended {new Date(regEndDate).toLocaleDateString()})
        </span>
      )
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full text-xs font-bold">
        🟢 Live & Open for Edits
      </span>
    )
  }

  const columns = [
    { header: 'Semester / Term', accessor: 'term' },
    {
      header: 'Scope',
      accessor: () => (
        <span className="text-xs font-semibold px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded">
          1st Year (FY)
        </span>
      ),
    },
    {
      header: 'Club Allotment Window',
      accessor: (row: TermConfig) => (
        <div className="text-xs space-y-0.5">
          <div className="text-gray-700 font-medium">
            Opens: {new Date(row.registrationOpensAt).toLocaleString()}
          </div>
          <div className="text-gray-500">
            Closes: {new Date(row.registrationClosesAt).toLocaleString()}
          </div>
        </div>
      ),
    },
    {
      header: 'Profile Edit Phase',
      accessor: (row: TermConfig) => {
        if (row.isRegistrationActive === false) {
          return (
            <span className="text-xs font-bold px-2.5 py-1 bg-red-50 text-red-700 border border-red-200 rounded-full">
              🔒 Locked
            </span>
          )
        }
        if (!row.registrationStartDate && !row.registrationEndDate) {
          return (
            <span className="text-xs font-bold px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full">
              🟢 Unrestricted
            </span>
          )
        }
        const now = Date.now()
        const start = row.registrationStartDate ? new Date(row.registrationStartDate).getTime() : 0
        const end = row.registrationEndDate ? new Date(row.registrationEndDate).getTime() : Infinity
        if (now < start) {
          return (
            <span className="text-xs font-bold px-2.5 py-1 bg-yellow-50 text-yellow-700 border border-yellow-200 rounded-full">
              ⏳ Scheduled
            </span>
          )
        }
        if (now > end) {
          return (
            <span className="text-xs font-bold px-2.5 py-1 bg-gray-100 text-gray-600 rounded-full">
              🔒 Closed
            </span>
          )
        }
        return (
          <span className="text-xs font-bold px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full">
            🟢 Open
          </span>
        )
      },
    },
    {
      header: 'Club FCFS Status',
      accessor: (row: TermConfig) => {
        const now = new Date()
        const open = new Date(row.registrationOpensAt)
        const close = new Date(row.registrationClosesAt)
        if (!row.isActive) return <span className="text-gray-400 font-semibold">Disabled</span>
        if (now < open) return <span className="text-yellow-600 font-semibold">⏳ Upcoming</span>
        if (now > close) return <span className="text-red-600 font-semibold">🔒 Closed</span>
        return <span className="text-emerald-600 font-semibold">🟢 Active (Open)</span>
      },
    },
    {
      header: 'Actions',
      accessor: (row: TermConfig) => (
        <Button size="sm" variant="outline" onClick={() => handleOpenModal(row)}>
          Edit
        </Button>
      ),
    },
  ]

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">First-Year Registration Windows</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Configure profile registration phases and opening/closing schedules for First-Year clubs
          </p>
        </div>
        <Button onClick={() => handleOpenModal()}>+ Configure Term Window</Button>
      </div>

      {/* DEDICATED CARD: Student Registration Phase Settings */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-gray-100">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-bold text-gray-900">
                Student Registration Phase Settings
              </h2>
              {getPhaseStatusBadge()}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Control whether First-Year students can complete onboarding, register, or edit their profile details.
              When locked, student profile edits are rejected with a 403 error.
            </p>
          </div>
          {activeConfig && (
            <span className="text-xs font-semibold px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-lg">
              Term: {activeConfig.term}
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
          {/* Toggle Switch */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider">
              Profile Registration / Editing
            </label>
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-200">
              <input
                type="checkbox"
                id="regPhaseToggle"
                checked={regPhaseActive}
                onChange={(e) => setRegPhaseActive(e.target.checked)}
                className="h-5 w-5 text-indigo-600 focus:ring-indigo-500 rounded border-gray-300 cursor-pointer"
              />
              <label htmlFor="regPhaseToggle" className="text-sm font-bold text-gray-800 cursor-pointer">
                {regPhaseActive ? 'Enable Profile Editing' : 'Lock Profile Editing'}
              </label>
            </div>
          </div>

          {/* Start Date & Time */}
          <div>
            <Input
              label="Phase Start Date & Time"
              type="datetime-local"
              value={regStartDate}
              onChange={(e) => setRegStartDate(e.target.value)}
              disabled={!regPhaseActive}
            />
          </div>

          {/* End Date & Time */}
          <div>
            <Input
              label="Phase End Date & Time"
              type="datetime-local"
              value={regEndDate}
              onChange={(e) => setRegEndDate(e.target.value)}
              disabled={!regPhaseActive}
            />
          </div>
        </div>

        <div className="flex justify-between items-center pt-2">
          <p className="text-xs text-gray-400">
            * Leave start and end dates blank to allow unrestricted editing whenever the toggle is ON.
          </p>
          <Button
            onClick={handleSaveRegistrationPhase}
            disabled={savingPhase || !activeConfig}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-5"
          >
            {savingPhase ? 'Saving Settings...' : 'Save Registration Phase'}
          </Button>
        </div>
      </div>

      {/* Term Configs Table */}
      <div className="space-y-3">
        <h3 className="text-base font-bold text-gray-900">All First-Year Term Schedules</h3>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <DataTable columns={columns} data={configs} isLoading={loading} />
        </div>
      </div>

      {/* Modal for Creating / Editing Term Windows */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingId ? 'Edit First-Year Term Window' : 'Configure First-Year Term Window'}
      >
        <form onSubmit={handleSubmit} className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Semester / Term</label>
            <select
              value={formData.term}
              onChange={(e) => setFormData({ ...formData, term: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
              required
            >
              <option value="Sem-1">Sem-1 (1st Semester)</option>
              <option value="Sem-2">Sem-2 (2nd Semester)</option>
            </select>
          </div>

          <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 space-y-3">
            <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider">
              Club Allotment (FCFS) Window
            </h4>
            <Input
              label="Registration Opens At"
              type="datetime-local"
              value={formData.registrationOpensAt}
              onChange={(e) => setFormData({ ...formData, registrationOpensAt: e.target.value })}
              required
            />
            <Input
              label="Registration Closes At"
              type="datetime-local"
              value={formData.registrationClosesAt}
              onChange={(e) => setFormData({ ...formData, registrationClosesAt: e.target.value })}
              required
            />
            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="isActive"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                className="rounded text-indigo-600 focus:ring-indigo-500 h-4 w-4"
              />
              <label htmlFor="isActive" className="text-xs font-semibold text-gray-700">
                Active Club Allotment Window
              </label>
            </div>
          </div>

          <div className="p-3 bg-indigo-50/50 rounded-xl border border-indigo-100 space-y-3">
            <h4 className="text-xs font-bold text-indigo-900 uppercase tracking-wider">
              Student Profile Registration & Edit Phase
            </h4>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="modalIsRegistrationActive"
                checked={formData.isRegistrationActive}
                onChange={(e) => setFormData({ ...formData, isRegistrationActive: e.target.checked })}
                className="rounded text-indigo-600 focus:ring-indigo-500 h-4 w-4"
              />
              <label htmlFor="modalIsRegistrationActive" className="text-xs font-semibold text-gray-800">
                Enable Profile Registration & Editing for Students
              </label>
            </div>
            <Input
              label="Profile Phase Start (Optional)"
              type="datetime-local"
              value={formData.registrationStartDate}
              onChange={(e) => setFormData({ ...formData, registrationStartDate: e.target.value })}
              disabled={!formData.isRegistrationActive}
            />
            <Input
              label="Profile Phase End (Optional)"
              type="datetime-local"
              value={formData.registrationEndDate}
              onChange={(e) => setFormData({ ...formData, registrationEndDate: e.target.value })}
              disabled={!formData.isRegistrationActive}
            />
          </div>

          <div className="flex justify-end gap-2 mt-4 pt-2 border-t">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Save Window</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
