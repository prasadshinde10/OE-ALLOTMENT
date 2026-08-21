'use client'
import { useState, useEffect } from 'react'
import api from '@/lib/api'
import { useAuthContext } from '@/context/AuthContext'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'

export default function StudentStatusPage() {
  const { user } = useAuthContext()
  const [status, setStatus] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await api.get('/api/allocation/my-status')
        setStatus(res.data.allocation)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchStatus()
  }, [])

  if (loading) return <div className="flex justify-center p-12"><LoadingSpinner /></div>

  return (
    <div className="max-w-3xl mx-auto mt-8">
      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <div className="px-4 py-5 sm:px-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">Student Profile & Status</h3>
          <p className="mt-1 max-w-2xl text-sm text-gray-500">Personal details and elective allocation status.</p>
        </div>
        <div className="border-t border-gray-200 px-4 py-5 sm:p-0">
          <dl className="sm:divide-y sm:divide-gray-200">
            <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">Full name</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{user?.name}</dd>
            </div>
            <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">Hall Ticket Number</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{user?.hallTicketNumber}</dd>
            </div>
            <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">Class / Year</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{user?.class} / Year {user?.year}</dd>
            </div>
            <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">Allocation Status</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                {status ? (
                  <div className="bg-green-50 border border-green-200 rounded-md p-4">
                    <h4 className="text-lg font-bold text-green-800">{status.electiveName}</h4>
                    <p className="text-green-700">Code: {status.electiveCode}</p>
                    <p className="text-xs text-green-600 mt-2">Allocated at: {new Date(status.allocatedAt).toLocaleString()}</p>
                  </div>
                ) : (
                  <div className="text-yellow-600 font-medium">
                    <p>No allocation yet.</p>
                    <Link href="/student/select-elective" className="inline-block mt-3">
                      <Button>Select Elective Now</Button>
                    </Link>
                  </div>
                )}
              </dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  )
}
