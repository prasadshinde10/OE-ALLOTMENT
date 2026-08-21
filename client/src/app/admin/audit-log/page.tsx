'use client'
import { useState, useEffect } from 'react'
import api from '@/lib/api'
import { DataTable } from '@/components/ui/DataTable'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { AuditLogEntry } from '@/types'

export default function AdminAuditLogPage() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([])
  const [total, setTotal] = useState(0)
  const [filters, setFilters] = useState({ action: '', page: 1, limit: 10 })
  const [selectedLog, setSelectedLog] = useState<AuditLogEntry | null>(null)

  useEffect(() => {
    fetchLogs()
  }, [filters.page, filters.limit, filters.action])

  const fetchLogs = async () => {
    try {
      const params = new URLSearchParams(filters as any).toString()
      const res = await api.get(`/api/admin/audit-log?${params}`)
      setLogs(res.data.data)
      setTotal(res.data.total || res.data.pagination?.total || 0)
    } catch (err) {
      console.error(err)
    }
  }

  const columns = [
    { header: 'Time', accessor: (row: AuditLogEntry) => new Date(row.timestamp).toLocaleString() },
    { header: 'Action', accessor: 'action' },
    { header: 'Actor Role', accessor: 'actorRole' },
    { header: 'Target Type', accessor: 'targetType' },
    { 
      header: 'Details', 
      accessor: (row: AuditLogEntry) => (
        <Button size="sm" variant="outline" onClick={() => setSelectedLog(row)}>View Changes</Button>
      ) 
    }
  ]

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Audit Logs</h1>
      
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <div className="mb-4 flex gap-4">
          <Input placeholder="Filter by action..." value={filters.action} onChange={e => setFilters({...filters, action: e.target.value, page: 1})} />
        </div>
        <DataTable columns={columns} data={logs} pagination={{ page: filters.page, limit: filters.limit, total, onPageChange: p => setFilters({...filters, page: p}) }} />
      </div>

      <Modal isOpen={!!selectedLog} onClose={() => setSelectedLog(null)} title="Audit Log Details">
        {selectedLog && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><span className="font-semibold">Action:</span> {selectedLog.action}</div>
              <div><span className="font-semibold">Actor Role:</span> {selectedLog.actorRole}</div>
              <div><span className="font-semibold">Actor ID:</span> {selectedLog.actorId}</div>
              <div><span className="font-semibold">Target Type:</span> {selectedLog.targetType}</div>
              <div><span className="font-semibold">Target ID:</span> {selectedLog.targetId || '-'}</div>
              <div><span className="font-semibold">Timestamp:</span> {new Date(selectedLog.timestamp).toLocaleString()}</div>
            </div>
            
            {selectedLog.before && (
              <div>
                <h4 className="font-semibold text-sm mb-1 text-red-600">Before:</h4>
                <pre className="bg-gray-100 p-2 rounded text-xs overflow-auto max-h-40">{JSON.stringify(selectedLog.before, null, 2)}</pre>
              </div>
            )}
            
            {selectedLog.after && (
              <div>
                <h4 className="font-semibold text-sm mb-1 text-green-600">After:</h4>
                <pre className="bg-gray-100 p-2 rounded text-xs overflow-auto max-h-40">{JSON.stringify(selectedLog.after, null, 2)}</pre>
              </div>
            )}

            {selectedLog.metadata && (
              <div>
                <h4 className="font-semibold text-sm mb-1 text-blue-600">Metadata:</h4>
                <pre className="bg-gray-100 p-2 rounded text-xs overflow-auto max-h-40">{JSON.stringify(selectedLog.metadata, null, 2)}</pre>
              </div>
            )}
            
            <div className="flex justify-end mt-4">
              <Button onClick={() => setSelectedLog(null)}>Close</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
