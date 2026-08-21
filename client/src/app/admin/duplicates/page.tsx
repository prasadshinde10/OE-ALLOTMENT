'use client'
import { useState, useEffect } from 'react'
import api from '@/lib/api'
import { Button } from '@/components/ui/Button'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import toast from 'react-hot-toast'

export default function AdminDuplicatesPage() {
  const [duplicates, setDuplicates] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDuplicates()
  }, [])

  const fetchDuplicates = async () => {
    try {
      const res = await api.get('/api/admin/duplicates')
      setDuplicates(res.data.data)
    } catch (err) {
      toast.error('Failed to load duplicates')
    } finally {
      setLoading(false)
    }
  }

  const handleReject = async (id: string) => {
    if (!confirm('Are you sure you want to reject and delete this record?')) return
    try {
      await api.post(`/api/admin/duplicates/${id}/reject`)
      toast.success('Record rejected successfully')
      fetchDuplicates()
    } catch (err) {
      toast.error('Failed to reject record')
    }
  }

  if (loading) return <div className="flex justify-center p-12"><LoadingSpinner /></div>

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Duplicate Registrations Review</h1>
      
      {duplicates.length === 0 ? (
        <div className="bg-white p-8 text-center rounded-lg shadow-sm border border-gray-200">
          <p className="text-gray-500">No duplicate records found.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {duplicates.map((group, idx) => (
            <div key={idx} className="bg-white shadow rounded-lg overflow-hidden border border-gray-200">
              <div className="px-4 py-5 border-b border-gray-200 sm:px-6 bg-gray-50">
                <h3 className="text-lg leading-6 font-medium text-gray-900">Duplicate Group: {group._id}</h3>
                <p className="mt-1 max-w-2xl text-sm text-gray-500">{group.records.length} matching records</p>
              </div>
              <ul className="divide-y divide-gray-200">
                {group.records.map((record: any) => (
                  <li key={record._id} className="p-4 sm:px-6 hover:bg-gray-50 flex justify-between items-center">
                    <div>
                      <p className="text-sm font-medium text-indigo-600">{record.name}</p>
                      <div className="mt-2 text-sm text-gray-500 flex flex-col sm:flex-row sm:gap-4">
                        <span>HT: {record.hallTicketNumber}</span>
                        <span>Email: {record.instituteEmail}</span>
                        <span>Mobile: {record.mobileNumber}</span>
                        <span>Year: {record.year}</span>
                      </div>
                      <div className="mt-1">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${record.isVerified ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                          {record.isVerified ? 'Verified' : 'Unverified'}
                        </span>
                      </div>
                    </div>
                    <div>
                      {!record.isVerified && (
                        <Button variant="danger" size="sm" onClick={() => handleReject(record._id)}>
                          Reject
                        </Button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
