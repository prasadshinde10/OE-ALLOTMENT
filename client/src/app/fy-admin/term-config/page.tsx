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
  const [formData, setFormData] = useState({
    term: 'Sem-1',
    registrationOpensAt: '',
    registrationClosesAt: '',
    isActive: true,
  })

  useEffect(() => {
    fetchConfigs()
  }, [])

  const fetchConfigs = async () => {
    try {
      setLoading(true)
      const res = await api.get('/api/fy-admin/term-configs')
      setConfigs(res.data.data || [])
    } catch (err) {
      toast.error('Failed to load FY term configs')
    } finally {
      setLoading(false)
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
      })
    }
    setIsModalOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (editingId) {
        await api.put(`/api/fy-admin/term-configs/${editingId}`, formData)
        toast.success('Term window updated')
      } else {
        await api.post('/api/fy-admin/term-configs', formData)
        toast.success('Term window configured')
      }
      setIsModalOpen(false)
      fetchConfigs()
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error saving term config')
    }
  }

  const columns = [
    { header: 'Semester / Term', accessor: 'term' },
    {
      header: 'Scope',
      accessor: () => <span className="text-xs font-semibold px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded">1st Year (FY)</span>,
    },
    {
      header: 'Registration Opens',
      accessor: (row: TermConfig) => new Date(row.registrationOpensAt).toLocaleString(),
    },
    {
      header: 'Registration Closes',
      accessor: (row: TermConfig) => new Date(row.registrationClosesAt).toLocaleString(),
    },
    {
      header: 'Window Status',
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
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">First-Year Registration Windows</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Configure opening and closing schedules for First-Year club allotment rounds
          </p>
        </div>
        <Button onClick={() => handleOpenModal()}>+ Configure Term Window</Button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <DataTable columns={columns} data={configs} isLoading={loading} />
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingId ? 'Edit First-Year Term Window' : 'Configure First-Year Term Window'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
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

          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="isActive"
              checked={formData.isActive}
              onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              className="rounded text-indigo-600 focus:ring-indigo-500 h-4 w-4"
            />
            <label htmlFor="isActive" className="text-sm font-medium text-gray-700">
              Active Registration Window
            </label>
          </div>

          <div className="flex justify-end gap-2 mt-4">
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
