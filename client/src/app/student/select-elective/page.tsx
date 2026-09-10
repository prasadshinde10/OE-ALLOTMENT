'use client'
import { useState, useEffect } from 'react'
import api from '@/lib/api'
import { useAuthContext } from '@/context/AuthContext'
import { useSeatCounts } from '@/hooks/useSeatCounts'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Elective, TermConfig } from '@/types'
import toast from 'react-hot-toast'
import { SkeletonCard, Skeleton } from '@/components/ui/Skeleton'

export default function SelectElectivePage() {
  const { user } = useAuthContext()
  const [electives, setElectives] = useState<Elective[]>([])
  const [termConfig, setTermConfig] = useState<TermConfig | null>(null)
  const [allocationStatus, setAllocationStatus] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [confirmElective, setConfirmElective] = useState<Elective | null>(null)
  const [modalData, setModalData] = useState<{ isOpen: boolean; message: string }>({
    isOpen: false,
    message: '',
  })

  // Hook ensures real-time seat updates
  const { seatCounts } = useSeatCounts(user?.year)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      const [electivesRes, statusRes, configsRes] = await Promise.all([
        api.get(`/api/electives?year=${user?.year}`),
        api.get('/api/allocation/my-status'),
        api.get('/api/allocation/my-term-config'),
      ])

      setElectives(electivesRes.data.data || [])
      const allocation = statusRes.data.data || statusRes.data.allocation
      if (allocation && allocation.allocatedElectiveName) {
        setAllocationStatus(allocation)
      } else {
        setAllocationStatus(null)
      }

      setTermConfig(configsRes.data.data || null)
    } catch (err: any) {
      toast.error('Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  const handleSelect = (elective: Elective) => {
    setConfirmElective(elective)
  }

  const confirmAllocation = async () => {
    if (!confirmElective) return
    try {
      setSubmitting(true)
      await api.post('/api/allocation/allocate', { electiveId: confirmElective._id })
      toast.success('Successfully allocated elective!')
      setConfirmElective(null)
      await fetchData()
    } catch (err: any) {
      setConfirmElective(null)
      if (err.response?.status === 409) {
        setModalData({
          isOpen: true,
          message: 'This elective is full. No seats are currently available.',
        })
      } else {
        toast.error(err.response?.data?.message || 'Failed to allocate elective')
      }
    } finally {
      setSubmitting(false)
    }
  }

  const getStatusColor = (capacity: number, filled: number, isSelected: boolean) => {
    if (isSelected) return 'bg-teal-50 border-teal-300 ring-2 ring-teal-500 ring-opacity-50'
    const available = capacity - filled
    const ratio = available / capacity
    if (available <= 0) return 'bg-gray-50 border-gray-200 opacity-80'
    if (ratio > 0.5) return 'bg-green-50/50 border-green-200'
    if (ratio > 0.25) return 'bg-yellow-50/50 border-yellow-200'
    return 'bg-red-50/50 border-red-200'
  }

  const getProgressColor = (capacity: number, filled: number) => {
    const available = capacity - filled
    const ratio = available / capacity
    if (ratio > 0.5) return 'bg-green-500'
    if (ratio > 0.25) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  if (loading) {
    return (
      <div className="space-y-6 animate-fadeIn">
        <div className="bg-white px-6 py-5 border border-gray-200 rounded-xl shadow-sm flex justify-between items-center">
          <div className="space-y-2">
            <Skeleton className="h-6 w-56" />
            <Skeleton className="h-4 w-32" />
          </div>
          <Skeleton className="h-7 w-40 rounded-full" />
        </div>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, idx) => (
            <SkeletonCard key={idx} />
          ))}
        </div>
      </div>
    )
  }

  // Check Registration Status
  const now = new Date()
  let isRegistrationOpen = false
  let statusMessage = 'Registration is currently closed'

  if (termConfig) {
    const openDate = new Date(termConfig.registrationOpensAt)
    const closeDate = new Date(termConfig.registrationClosesAt)
    if (now < openDate) {
      statusMessage = `Registration opens at ${openDate.toLocaleString()}`
    } else if (now > closeDate) {
      statusMessage = `Registration closed at ${closeDate.toLocaleString()}`
    } else {
      isRegistrationOpen = true
      statusMessage = `Registration closes at ${closeDate.toLocaleString()}`
    }
  }

  return (
    <div className="space-y-6">
      {allocationStatus && (
        <div className="bg-teal-50 border-l-4 border-teal-600 p-4 sm:p-5 rounded-r-xl shadow-sm">
          <div className="space-y-1">
            <h3 className="text-base sm:text-lg font-bold text-teal-900">
              Allocated: {allocationStatus.allocatedElectiveName}
            </h3>
            <p className="text-xs sm:text-sm text-teal-700">
              Semester: <span className="font-semibold">{allocationStatus.allocatedTerm || '-'}</span>
              <span className="hidden sm:inline"> | Allocated On: <span className="font-semibold">{allocationStatus.allocationTimestamp ? new Date(allocationStatus.allocationTimestamp).toLocaleString() : 'N/A'}</span></span>
            </p>
            {allocationStatus.allocatedDivision && (
              <p className="text-xs sm:text-sm text-teal-700">
                Division: <span className="font-semibold">{allocationStatus.allocatedDivision}</span>
                {allocationStatus.allocatedFaculty && (
                  <> | Faculty: <span className="font-semibold">{allocationStatus.allocatedFaculty}</span> | Phone: <span className="font-semibold">{allocationStatus.allocatedFacultyPhone || allocationStatus.allocatedFacultyContact || 'N/A'}</span></>
                )}
                {allocationStatus.allocatedHall && (<> | Hall: <span className="font-semibold">{allocationStatus.allocatedHall}</span></>)}
              </p>
            )}
          </div>
        </div>
      )}

      <div className="bg-white px-6 py-5 border border-gray-200 rounded-xl shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Select Your Open Elective</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Year {user?.year} {termConfig ? `• ${termConfig.term}` : ''}
          </p>
        </div>
        <span
          className={`inline-flex items-center px-3.5 py-1.5 rounded-full text-xs font-semibold self-start sm:self-auto ${
            isRegistrationOpen ? 'bg-green-100 text-green-800 border border-green-200' : 'bg-red-100 text-red-800 border border-red-200'
          }`}
        >
          {statusMessage}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {electives.map((elective) => {
          const seatUpdate = seatCounts.find(
            (s) => s.electiveId === elective._id || (s as any)._id === elective._id
          )
          const filled = seatUpdate ? seatUpdate.seatsFilled : (elective.seatsFilled || 0)
          const capacity = elective.capacity
          const available = Math.max(0, capacity - filled)
          const isFull = available <= 0
          const fillPercentage = Math.min(100, (filled / capacity) * 100)
          const isSelected = allocationStatus?.allocatedElectiveId === elective._id

          return (
            <div
              key={elective._id}
              className={`rounded-xl border shadow-sm p-6 flex flex-col justify-between transition-all ${getStatusColor(
                capacity,
                filled,
                isSelected
              )}`}
            >
              <div>
                <div className="flex justify-between items-start mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-teal-700 bg-teal-100 px-2.5 py-0.5 rounded-md">
                    {elective.code}
                  </span>
                  {isSelected ? (
                    <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-green-600 text-white flex items-center gap-1">
                      ✓ Allocated
                    </span>
                  ) : (
                    <span
                      className={`px-2.5 py-1 text-xs font-semibold rounded-full ${
                        isFull
                          ? 'bg-red-100 text-red-800 border border-red-200'
                          : available <= 5
                          ? 'bg-yellow-100 text-yellow-800 border border-yellow-200'
                          : 'bg-green-100 text-green-800 border border-green-200'
                      }`}
                    >
                      {isFull ? 'FULL' : `${available} Available`}
                    </span>
                  )}
                </div>

                <h3 className="text-lg font-bold text-gray-900 mt-2">{elective.name}</h3>

                {elective.offeredByDepartment && (
                  <p className="text-xs font-medium text-gray-600 mt-1 flex items-center gap-1">
                    <span className="text-gray-400">Department:</span>
                    <span className="text-gray-800 font-semibold">{elective.offeredByDepartment}</span>
                  </p>
                )}

                {elective.syllabusUrl && (
                  <a
                    href={elective.syllabusUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 mt-2 px-3 py-1 text-xs font-medium text-teal-700 bg-teal-50 border border-teal-200 rounded-lg hover:bg-teal-100 transition-colors"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    View Syllabus
                  </a>
                )}

                <div className="mt-4 pt-3 border-t border-gray-100/80">
                  <div className="flex justify-between text-xs text-gray-600 mb-1.5">
                    <span>Available: <strong className="text-gray-900">{available}</strong> / {capacity}</span>
                    <span>Filled: <strong className="text-gray-900">{filled}</strong></span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all duration-300 ${getProgressColor(
                        capacity,
                        filled
                      )}`}
                      style={{ width: `${fillPercentage}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-2">
                <Button
                  className="w-full font-medium"
                  disabled={
                    !isRegistrationOpen ||
                    isFull ||
                    !!allocationStatus ||
                    submitting
                  }
                  onClick={() => handleSelect(elective)}
                  variant={isSelected ? 'secondary' : isFull ? 'ghost' : 'primary'}
                >
                  {isSelected
                    ? 'Currently Selected'
                    : isFull
                    ? 'Class Full (0 Seats)'
                    : allocationStatus
                    ? 'Already Allocated'
                    : 'Select Elective'}
                </Button>
              </div>
            </div>
          )
        })}
      </div>

      {electives.length === 0 && (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-200 text-gray-500">
          <p className="text-lg font-medium text-gray-700">No electives currently found for your year.</p>
          <p className="text-sm text-gray-400 mt-1">Please check back once the course list is published.</p>
        </div>
      )}

      {confirmElective && (
        <Modal
          isOpen={!!confirmElective}
          onClose={() => setConfirmElective(null)}
          title="Confirm Elective Selection"
        >
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Are you sure you want to select the following elective? This action cannot be undone.
            </p>
            <div className="bg-teal-50 border border-teal-200 rounded-lg p-4 space-y-1">
              <p className="text-lg font-bold text-teal-900">{confirmElective.name}</p>
              <p className="text-sm text-teal-700">Code: {confirmElective.code}</p>
              {confirmElective.offeredByDepartment && (
                <p className="text-sm text-teal-700">Department: {confirmElective.offeredByDepartment}</p>
              )}
              <p className="text-sm text-teal-700">
                Available Seats: {confirmElective.capacity - (confirmElective.seatsFilled || 0)} / {confirmElective.capacity}
              </p>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setConfirmElective(null)} disabled={submitting}>
                Cancel
              </Button>
              <Button onClick={confirmAllocation} disabled={submitting}>
                {submitting ? 'Allocating...' : 'Yes, Confirm Selection'}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {modalData.isOpen && (
        <Modal
          isOpen={modalData.isOpen}
          onClose={() => setModalData({ isOpen: false, message: '' })}
          title="Elective Selection"
        >
          <div className="mt-2 text-sm text-gray-600">
            <p>{modalData.message}</p>
          </div>
          <div className="mt-5 flex justify-end">
            <Button onClick={() => setModalData({ isOpen: false, message: '' })}>Close</Button>
          </div>
        </Modal>
      )}
    </div>
  )
}
