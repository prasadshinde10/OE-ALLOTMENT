'use client'
import { useState, useEffect } from 'react'
import api from '@/lib/api'
import { useAuthContext } from '@/context/AuthContext'
import { useSeatCounts } from '@/hooks/useSeatCounts'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Elective, TermConfig } from '@/types'
import toast from 'react-hot-toast'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'

export default function SelectElectivePage() {
  const { user } = useAuthContext()
  const [electives, setElectives] = useState<Elective[]>([])
  const [termConfig, setTermConfig] = useState<TermConfig | null>(null)
  const [allocationStatus, setAllocationStatus] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [modalData, setModalData] = useState<{isOpen: boolean, message: string}>({ isOpen: false, message: '' })

  // Hooks ensure real-time seat counts
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
        api.get('/api/admin/term-configs')
      ])
      
      setElectives(electivesRes.data.data || [])
      const allocation = statusRes.data.data || statusRes.data.allocation
      if (allocation && allocation.allocatedElectiveName) {
        setAllocationStatus(allocation)
      }
      
      const currentYearConfig = (configsRes.data.data || []).find((c: TermConfig) => c.year === Number(user?.year) && new Date() <= new Date(c.registrationClosesAt))
      setTermConfig(currentYearConfig || (configsRes.data.data && configsRes.data.data[0]) || null)
    } catch (err: any) {
      toast.error('Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  const handleSelect = async (electiveId: string) => {
    try {
      setSubmitting(true)
      await api.post('/api/allocation/allocate', { electiveId })
      toast.success('Successfully allocated!')
      await fetchData()
    } catch (err: any) {
      if (err.response?.status === 409) {
        setModalData({ isOpen: true, message: 'This elective is now full, please select another.' })
      } else {
        toast.error(err.response?.data?.message || 'Failed to allocate elective')
      }
    } finally {
      setSubmitting(false)
    }
  }

  const getStatusColor = (capacity: number, filled: number) => {
    const available = capacity - filled
    const ratio = available / capacity
    if (available <= 0) return 'bg-gray-100 border-gray-300'
    if (ratio > 0.5) return 'bg-green-50 border-green-200'
    if (ratio > 0.25) return 'bg-yellow-50 border-yellow-200'
    return 'bg-red-50 border-red-200'
  }
  
  const getProgressColor = (capacity: number, filled: number) => {
    const available = capacity - filled
    const ratio = available / capacity
    if (ratio > 0.5) return 'bg-green-500'
    if (ratio > 0.25) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  if (loading) return <div className="flex justify-center p-12"><LoadingSpinner /></div>

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
        <div className="bg-indigo-50 border-l-4 border-indigo-500 p-4 mb-6 rounded-r-md">
          <div className="flex">
            <div className="flex-shrink-0">
              <span className="text-xl">✅</span>
            </div>
            <div className="ml-3">
              <h3 className="text-lg font-medium text-indigo-800">You are allocated to {allocationStatus.allocatedElectiveName || allocationStatus.electiveName}</h3>
              <p className="mt-1 text-sm text-indigo-700">Term: {allocationStatus.allocatedTerm || '-'}</p>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white px-4 py-5 border-b border-gray-200 sm:px-6 rounded-lg shadow-sm flex justify-between items-center">
        <h3 className="text-lg leading-6 font-medium text-gray-900">Select Your Open Elective</h3>
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${isRegistrationOpen ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
          {statusMessage}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {electives.map(elective => {
          const seatUpdate = seatCounts.find((s) => s.electiveId === elective._id)
          const filled = seatUpdate ? seatUpdate.seatsFilled : (elective.seatsFilled || 0)
          const capacity = elective.capacity
          const available = capacity - filled
          const isFull = available <= 0
          const fillPercentage = Math.min(100, (filled / capacity) * 100)

          return (
            <div key={elective._id} className={`rounded-lg border shadow-sm p-6 flex flex-col ${getStatusColor(capacity, filled)}`}>
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h4 className="text-xl font-bold text-gray-900">{elective.name}</h4>
                  <p className="text-sm text-gray-500">{elective.code}</p>
                </div>
                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${isFull ? 'bg-gray-200 text-gray-800' : 'bg-white border text-gray-700'}`}>
                  {isFull ? 'FULL' : `${available} Left`}
                </span>
              </div>
              
              <div className="mt-auto pt-4">
                <div className="flex justify-between text-sm text-gray-600 mb-1">
                  <span>Seats Filled</span>
                  <span>{filled} / {capacity}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
                  <div className={`h-2 rounded-full ${getProgressColor(capacity, filled)}`} style={{ width: `${fillPercentage}%` }}></div>
                </div>
                
                <Button 
                  className="w-full" 
                  disabled={!isRegistrationOpen || isFull || !!allocationStatus || submitting}
                  onClick={() => handleSelect(elective._id)}
                >
                  {isFull ? 'Class Full' : allocationStatus ? 'Already Allocated' : 'Select Elective'}
                </Button>
              </div>
            </div>
          )
        })}
      </div>

      {electives.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          No electives available for your year.
        </div>
      )}

      {modalData.isOpen && (
        <Modal 
          isOpen={modalData.isOpen} 
          onClose={() => setModalData({ isOpen: false, message: '' })} 
          title="Allocation Failed"
        >
          <div className="mt-2">
            <p className="text-sm text-gray-500">{modalData.message}</p>
          </div>
          <div className="mt-4">
            <Button onClick={() => setModalData({ isOpen: false, message: '' })}>Close</Button>
          </div>
        </Modal>
      )}
    </div>
  )
}
