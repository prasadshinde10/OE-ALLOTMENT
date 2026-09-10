'use client'

import { useState, useEffect } from 'react'
import api from '@/lib/api'
import { useAuthContext } from '@/context/AuthContext'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { SkeletonProfile } from '@/components/ui/Skeleton'

export default function StudentStatusPage() {
  const { user } = useAuthContext()
  const [status, setStatus] = useState<any>(null)
  const [clubStatus, setClubStatus] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const isFYStudent = user?.year === 1

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        setLoading(true)
        if (isFYStudent) {
          const [statusRes, clubRes] = await Promise.allSettled([
            api.get('/api/allocation/my-status'),
            api.get('/api/club-allocation/my-status'),
          ])
          if (statusRes.status === 'fulfilled') {
            setStatus(statusRes.value.data.data)
          }
          if (clubRes.status === 'fulfilled') {
            setClubStatus(clubRes.value.data.data)
          }
        } else {
          const res = await api.get('/api/allocation/my-status')
          setStatus(res.data.data || res.data.allocation)
        }
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    if (user) {
      fetchStatus()
    }
  }, [user, isFYStudent])

  if (loading) return <SkeletonProfile />

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="bg-white shadow-sm border border-gray-200 overflow-hidden sm:rounded-xl">
        <div className="px-5 py-5 sm:px-6 flex justify-between items-center bg-gray-50 border-b border-gray-200">
          <div>
            <h3 className="text-lg font-bold text-gray-900">
              {isFYStudent ? 'First-Year Student Profile & Club Status' : 'Student Profile & Elective Status'}
            </h3>
            <p className="mt-0.5 text-xs text-gray-500">Official academic credentials and allotment details</p>
          </div>
          <Link href="/student/profile">
            <Button size="sm" variant="outline">
              ✏️ Edit Profile
            </Button>
          </Link>
        </div>

        <div className="px-4 py-5 sm:p-6">
          <dl className="grid grid-cols-1 sm:grid-cols-3 gap-4 pb-6 border-b border-gray-100">
            <div>
              <dt className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Full Name</dt>
              <dd className="mt-1 text-sm font-medium text-gray-900">
                {status
                  ? `${status.firstName} ${status.middleName || ''} ${status.lastName}`.replace(/\s+/g, ' ').trim()
                  : user?.name}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Institute Email</dt>
              <dd className="mt-1 text-sm font-medium text-gray-900">{user?.email}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Academic Year</dt>
              <dd className="mt-1 text-sm font-medium text-gray-900">Year {user?.year} {isFYStudent ? '(First Year)' : ''}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Department / Branch</dt>
              <dd className="mt-1 text-sm font-medium text-gray-900">{status?.branch || '-'}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Class Roll Number</dt>
              <dd className="mt-1 text-sm font-medium text-gray-900">{status?.rollNumber || '-'}</dd>
            </div>
            {!isFYStudent && (
              <div>
                <dt className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Hall Ticket / PRN</dt>
                <dd className="mt-1 text-sm font-medium text-gray-900">{status?.hallTicketNumber || '-'}</dd>
              </div>
            )}
          </dl>

          {/* Allotment Sections */}
          <div className="pt-6">
            <h4 className="text-base font-bold text-gray-900 mb-4">
              {isFYStudent ? 'First-Year Club Allocations' : 'Open Elective Allocation'}
            </h4>

            {isFYStudent ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Co-Curricular Club Card */}
                <div className="border border-gray-200 rounded-xl p-5 bg-gradient-to-b from-teal-50/40 to-white">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold uppercase tracking-wider text-teal-700 bg-teal-100 px-2.5 py-1 rounded">
                      Co-Curricular Club
                    </span>
                    {clubStatus?.coCurricular?.clubName && (
                      <span className="text-xs text-emerald-600 font-semibold">Confirmed</span>
                    )}
                  </div>

                  {clubStatus?.coCurricular?.clubName ? (
                    <div className="space-y-3">
                      <h5 className="text-lg font-bold text-gray-900">
                        {clubStatus.coCurricular.clubName}
                      </h5>
                      <div className="space-y-1.5 text-xs text-gray-600 bg-white/80 p-3 rounded-lg border border-teal-100">
                        <p>
                          <strong className="text-gray-800">Coordinator:</strong>{' '}
                          {clubStatus.coCurricular.coordinator || 'Assigned Division Coordinator'} |{' '}
                          <strong className="text-gray-800">Phone:</strong>{' '}
                          {clubStatus.coCurricular.contact || 'N/A'}
                        </p>
                        <p>
                          <strong className="text-gray-800">Division:</strong>{' '}
                          {clubStatus.coCurricular.division || 'Awaiting Division Rollout'} |{' '}
                          <strong className="text-gray-800">Hall:</strong>{' '}
                          {clubStatus.coCurricular.hall || 'N/A'}
                        </p>
                        {clubStatus.coCurricular.timestamp && (
                          <p className="text-[11px] text-gray-400 pt-1">
                            Allocated on {new Date(clubStatus.coCurricular.timestamp).toLocaleString()}
                          </p>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-6 space-y-3">
                      <p className="text-sm text-gray-500">No Co-Curricular club selected yet.</p>
                      <Link href="/student/select-club">
                        <Button size="sm">Select Co-Curricular Club</Button>
                      </Link>
                    </div>
                  )}
                </div>

                {/* Extra-Curricular Club Card */}
                <div className="border border-gray-200 rounded-xl p-5 bg-gradient-to-b from-accent-50/40 to-white">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold uppercase tracking-wider text-accent-700 bg-accent-100 px-2.5 py-1 rounded">
                      Extra-Curricular Club
                    </span>
                    {clubStatus?.extraCurricular?.clubName && (
                      <span className="text-xs text-emerald-600 font-semibold">Confirmed</span>
                    )}
                  </div>

                  {clubStatus?.extraCurricular?.clubName ? (
                    <div className="space-y-3">
                      <h5 className="text-lg font-bold text-gray-900">
                        {clubStatus.extraCurricular.clubName}
                      </h5>
                      <div className="space-y-1.5 text-xs text-gray-600 bg-white/80 p-3 rounded-lg border border-accent-100">
                        <p>
                          <strong className="text-gray-800">Coordinator:</strong>{' '}
                          {clubStatus.extraCurricular.coordinator || 'Assigned Division Coordinator'} |{' '}
                          <strong className="text-gray-800">Phone:</strong>{' '}
                          {clubStatus.extraCurricular.contact || 'N/A'}
                        </p>
                        <p>
                          <strong className="text-gray-800">Division:</strong>{' '}
                          {clubStatus.extraCurricular.division || 'Awaiting Division Rollout'} |{' '}
                          <strong className="text-gray-800">Hall:</strong>{' '}
                          {clubStatus.extraCurricular.hall || 'N/A'}
                        </p>
                        {clubStatus.extraCurricular.timestamp && (
                          <p className="text-[11px] text-gray-400 pt-1">
                            Allocated on {new Date(clubStatus.extraCurricular.timestamp).toLocaleString()}
                          </p>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-6 space-y-3">
                      <p className="text-sm text-gray-500">No Extra-Curricular club selected yet.</p>
                      <Link href="/student/select-club">
                        <Button size="sm" variant="secondary">Select Extra-Curricular Club</Button>
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              // Upper Year Elective Allotment Card
              <div>
                {status && status.allocatedElectiveName ? (
                  <div className="bg-green-50 border border-green-200 rounded-xl p-5 space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-xs font-bold text-green-700 uppercase tracking-wider">
                          Allotted Open Elective
                        </span>
                        <h4 className="text-xl font-bold text-green-900 mt-1">{status.allocatedElectiveName}</h4>
                      </div>
                      <span className="text-xs font-semibold px-2.5 py-1 bg-green-100 text-green-800 rounded-full">
                        {status.allocatedTerm || 'Current Term'}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-green-200">
                      <div>
                        <span className="text-xs text-green-600 block">Division</span>
                        <p className="text-sm font-bold text-green-900">{status.allocatedDivision || 'Pending'}</p>
                      </div>
                      <div className="sm:col-span-2">
                        <span className="text-xs text-green-600 block">Faculty Details</span>
                        <p className="text-sm font-semibold text-green-900">
                          Faculty: {status.allocatedFaculty || 'N/A'} | Phone: {status.allocatedFacultyPhone || status.allocatedFacultyContact || 'N/A'}
                        </p>
                      </div>
                    </div>

                    {status.allocatedHall && (
                      <div className="text-xs text-green-700">
                        <strong>Classroom Hall:</strong> {status.allocatedHall}
                      </div>
                    )}
                    {status.allocationTimestamp && (
                      <p className="text-[11px] text-green-600">
                        Allocated at: {new Date(status.allocationTimestamp).toLocaleString()}
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 text-center space-y-3">
                    <p className="text-sm text-yellow-800 font-medium">No Open Elective has been allocated yet.</p>
                    <Link href="/student/select-elective">
                      <Button>Select Elective Now</Button>
                    </Link>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
