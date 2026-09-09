'use client'

import { useState, useEffect } from 'react'
import api from '@/lib/api'
import { useAuthContext } from '@/context/AuthContext'
import { useClubSeatCounts } from '@/hooks/useClubSeatCounts'
import { Button } from '@/components/ui/Button'
import toast from 'react-hot-toast'
import { Club, TermConfig } from '@/types'
import Link from 'next/link'
import { normalizeBranch, isBranchEligible } from '@/utils/branchMatcher'

export default function SelectClubPage() {
  const { user } = useAuthContext()
  const { seatCounts } = useClubSeatCounts()

  const [clubs, setClubs] = useState<Club[]>([])
  const [termConfig, setTermConfig] = useState<TermConfig | null>(null)
  const [studentStatus, setStudentStatus] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [allocatingId, setAllocatingId] = useState<string | null>(null)
  const [studentBranch, setStudentBranch] = useState<string>('')

  useEffect(() => {
    fetchInitialData()
  }, [])

  const fetchInitialData = async () => {
    try {
      setLoading(true)
      const [clubsRes, configRes, statusRes] = await Promise.allSettled([
        api.get('/api/clubs?year=1&active=true'),
        api.get('/api/club-allocation/my-term-config'),
        api.get('/api/club-allocation/my-status'),
      ])

      if (clubsRes.status === 'fulfilled') {
        setClubs(clubsRes.value.data.data || [])
      }
      if (configRes.status === 'fulfilled') {
        setTermConfig(configRes.value.data.data || null)
      }
      let resolvedBranch = ''
      if (statusRes.status === 'fulfilled') {
        setStudentStatus(statusRes.value.data.data || null)
        resolvedBranch = statusRes.value.data.data?.branch || ''
      }
      if (!resolvedBranch) {
        try {
          const meRes = await api.get('/api/auth/me')
          resolvedBranch = meRes.data.data?.branch || ''
        } catch (e) {
          // ignore profile lookup fallback error
        }
      }
      setStudentBranch(resolvedBranch)
    } catch (err) {
      toast.error('Failed to load club allocation portal')
    } finally {
      setLoading(false)
    }
  }

  // Merge real-time socket seat counts into clubs list
  const mergedClubs = clubs.map((c) => {
    const liveCount = seatCounts.find((s) => (s.clubId || s._id) === c._id)
    if (liveCount) {
      return {
        ...c,
        seatsFilled: liveCount.seatsFilled,
        remaining: liveCount.remaining,
      }
    }
    return {
      ...c,
      remaining: c.capacity - c.seatsFilled,
    }
  })

  // Helper: check if student branch is eligible for a club's target programs
  const isEligibleForClub = (club: Club): boolean => {
    if (!club.targetBranches || club.targetBranches.length === 0) return true
    if (!studentBranch) return true // If branch unknown, show all
    return isBranchEligible(studentBranch, club.targetBranches)
  }

  const coCurricularClubs = mergedClubs.filter((c) => c.category === 'co-curricular')
  const extraCurricularClubs = mergedClubs.filter((c) => c.category === 'extra-curricular')
  const eligibleCoCurricular = coCurricularClubs.filter(isEligibleForClub)
  const restrictedCoCurricular = coCurricularClubs.filter(c => !isEligibleForClub(c))

  const now = new Date()
  const isWindowOpen =
    termConfig &&
    termConfig.isActive &&
    now >= new Date(termConfig.registrationOpensAt) &&
    now <= new Date(termConfig.registrationClosesAt)

  const isWindowUpcoming =
    termConfig && termConfig.isActive && now < new Date(termConfig.registrationOpensAt)

  const isWindowClosed =
    termConfig && (!termConfig.isActive || now > new Date(termConfig.registrationClosesAt))

  const [confirmClub, setConfirmClub] = useState<Club | null>(null)

  const handleSelectClub = (club: Club) => {
    if (!isWindowOpen) {
      toast.error('Registration window is not open at this time.')
      return
    }
    setConfirmClub(club)
  }

  const handleConfirmAllocation = async () => {
    if (!confirmClub) return
    const club = confirmClub
    setConfirmClub(null)

    try {
      setAllocatingId(club._id)
      const res = await api.post('/api/club-allocation/allocate', { clubId: club._id })
      toast.success(`Successfully allocated to ${club.name}!`)

      // Refresh student status
      const statusRes = await api.get('/api/club-allocation/my-status')
      setStudentStatus(statusRes.data.data)

      // Refresh clubs
      const clubsRes = await api.get('/api/clubs?year=1&active=true')
      setClubs(clubsRes.data.data || [])
    } catch (err: any) {
      if (err.response?.status === 409) {
        toast.error(err.response.data.message || 'This club is full. Please choose another club.')
      } else {
        toast.error(err.response?.data?.message || 'Failed to allocate club.')
      }
    } finally {
      setAllocatingId(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center space-y-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto" />
          <p className="text-sm text-gray-500">Loading First-Year clubs...</p>
        </div>
      </div>
    )
  }

  const hasCoCurricular = !!studentStatus?.coCurricular?.clubName
  const hasExtraCurricular = !!studentStatus?.extraCurricular?.clubName

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header & Registration Status Banner */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-gray-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-50 border border-indigo-100 rounded-full text-xs font-semibold text-indigo-700">
                🌟 First-Year Mandatory Selection
              </span>
              {studentBranch && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 border border-blue-200 rounded-full text-xs font-bold text-blue-800">
                  🎓 Your Branch: {studentBranch} ({normalizeBranch(studentBranch)})
                </span>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900">
              First-Year Club Allotment Portal
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              Every First-Year student must select <strong>exactly one Co-Curricular Club</strong> and{' '}
              <strong>exactly one Extra-Curricular Club</strong>. Allocations are strictly First-Come, First-Served (FCFS).
            </p>
          </div>

          {hasCoCurricular && hasExtraCurricular && (
            <Link href="/student/status">
              <Button variant="outline" className="text-emerald-700 border-emerald-300 bg-emerald-50 hover:bg-emerald-100">
                ✓ View My Allotted Clubs
              </Button>
            </Link>
          )}
        </div>

        {/* Window Banner */}
        {isWindowUpcoming && (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-sm flex items-center gap-3">
            <span className="text-xl">⏳</span>
            <div>
              <strong>Club registration is upcoming.</strong> Selection opens on{' '}
              {new Date(termConfig!.registrationOpensAt).toLocaleString()}.
            </div>
          </div>
        )}

        {isWindowClosed && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-800 text-sm flex items-center gap-3">
            <span className="text-xl">🔒</span>
            <div>
              <strong>Club registration is currently closed.</strong> Submissions closed on{' '}
              {termConfig ? new Date(termConfig.registrationClosesAt).toLocaleString() : 'N/A'}.
            </div>
          </div>
        )}

        {isWindowOpen && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-sm flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="animate-pulse h-2.5 w-2.5 rounded-full bg-emerald-500" />
              <span>
                <strong>Registration is Live!</strong> Closes on{' '}
                {new Date(termConfig!.registrationClosesAt).toLocaleString()}.
              </span>
            </div>
            <span className="text-xs font-semibold px-2 py-0.5 bg-emerald-200/60 rounded">FCFS Active</span>
          </div>
        )}
      </div>

      {/* SECTION 1: CO-CURRICULAR CLUBS */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <span>🎓 1. Co-Curricular Clubs</span>
              <span className="text-xs font-medium px-2 py-0.5 bg-indigo-100 text-indigo-800 rounded-full">
                Pick 1
              </span>
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Technical, research, coding, robotics, and academic interest clubs
            </p>
          </div>
          {hasCoCurricular && (
            <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-3 py-1 rounded-full">
              ✓ Allocated: {studentStatus.coCurricular.clubName}
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {eligibleCoCurricular.map((club) => {
            const isAllocatedToThis = studentStatus?.coCurricular?.clubId === club._id
            const isCategoryAllocated = hasCoCurricular
            const remaining = club.remaining ?? club.capacity - club.seatsFilled
            const isFull = remaining <= 0
            const percentFilled = Math.min(100, Math.round((club.seatsFilled / club.capacity) * 100))

            return (
              <div
                key={club._id}
                className={`bg-white rounded-xl border p-5 transition-all flex flex-col justify-between ${
                  isAllocatedToThis
                    ? 'border-emerald-500 ring-2 ring-emerald-500/20 shadow-md'
                    : isFull
                    ? 'border-gray-200 bg-gray-50/70 opacity-75'
                    : 'border-gray-200 hover:border-indigo-300 hover:shadow-md'
                }`}
              >
                <div>
                  <div className="flex justify-between items-start gap-2 mb-2">
                    <span className="text-xs font-bold tracking-wider text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                      {club.code}
                    </span>
                    {isAllocatedToThis && (
                      <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
                        ✓ Your Club
                      </span>
                    )}
                  </div>

                  <h3 className="text-base font-bold text-gray-900 leading-snug">{club.name}</h3>

                  {/* Target Program Badges */}
                  {club.targetBranches && club.targetBranches.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {club.targetBranches.map((branch) => (
                        <span key={branch} className="text-[10px] font-semibold px-1.5 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded">
                          {branch}
                        </span>
                      ))}
                    </div>
                  )}

                  {club.coordinatorName && (
                    <div className="mt-3 text-xs text-gray-600 bg-gray-50 p-2.5 rounded-lg border border-gray-100">
                      <span className="font-semibold text-gray-800">Coordinator:</span> {club.coordinatorName}
                      {club.coordinatorContact && <span> ({club.coordinatorContact})</span>}
                    </div>
                  )}
                </div>

                {/* Capacity & Action */}
                <div className="mt-4 pt-3 border-t border-gray-100 space-y-3">
                  <div>
                    <div className="flex justify-between text-xs font-medium text-gray-600 mb-1">
                      <span>Seats: {club.seatsFilled} / {club.capacity}</span>
                      <span className={isFull ? 'text-red-600 font-bold' : 'text-emerald-600 font-semibold'}>
                        {isFull ? 'FULL' : `${remaining} left`}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-2 rounded-full transition-all duration-500 ${
                          isFull ? 'bg-red-500' : percentFilled >= 80 ? 'bg-amber-500' : 'bg-indigo-600'
                        }`}
                        style={{ width: `${percentFilled}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {club.syllabusUrl && (
                      <a
                        href={club.syllabusUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-indigo-600 hover:text-indigo-800 font-medium px-2 py-1"
                      >
                        Info ↗
                      </a>
                    )}

                    <Button
                      onClick={() => handleSelectClub(club)}
                      disabled={
                        isAllocatedToThis ||
                        isCategoryAllocated ||
                        isFull ||
                        !isWindowOpen ||
                        allocatingId === club._id
                      }
                      variant={isAllocatedToThis ? 'secondary' : 'primary'}
                      className="w-full"
                      size="sm"
                    >
                      {allocatingId === club._id
                        ? 'Allocating...'
                        : isAllocatedToThis
                        ? 'Confirmed ✓'
                        : isCategoryAllocated
                        ? 'Category Selected'
                        : isFull
                        ? 'Club Full'
                        : 'Select Club'}
                    </Button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Restricted Co-Curricular Clubs (other branches) */}
        {restrictedCoCurricular.length > 0 && (
          <div className="mt-6">
            <p className="text-xs font-medium text-gray-400 mb-3 uppercase tracking-wide">
              Other Branch Clubs ({restrictedCoCurricular.length})
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 opacity-50">
              {restrictedCoCurricular.map((club) => (
                <div
                  key={club._id}
                  className="bg-gray-50 rounded-xl border border-gray-200 p-4 flex flex-col"
                >
                  <div className="flex justify-between items-start gap-2 mb-2">
                    <span className="text-xs font-bold tracking-wider text-gray-400 bg-gray-100 px-2 py-0.5 rounded">
                      {club.code}
                    </span>
                    <span className="text-[10px] font-medium text-orange-600 bg-orange-50 px-2 py-0.5 rounded">
                      Restricted
                    </span>
                  </div>
                  <h3 className="text-sm font-semibold text-gray-500">{club.name}</h3>
                  {club.targetBranches && club.targetBranches.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {club.targetBranches.map((branch) => (
                        <span key={branch} className="text-[10px] font-medium px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded">
                          {branch}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* SECTION 2: EXTRA-CURRICULAR CLUBS */}
      <div className="space-y-4 pt-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <span>🎨 2. Extra-Curricular Clubs</span>
              <span className="text-xs font-medium px-2 py-0.5 bg-purple-100 text-purple-800 rounded-full">
                Pick 1
              </span>
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Arts, cultural, sports, literary, debate, photography, and social outreach clubs
            </p>
          </div>
          {hasExtraCurricular && (
            <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-3 py-1 rounded-full">
              ✓ Allocated: {studentStatus.extraCurricular.clubName}
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {extraCurricularClubs.map((club) => {
            const isAllocatedToThis = studentStatus?.extraCurricular?.clubId === club._id
            const isCategoryAllocated = hasExtraCurricular
            const remaining = club.remaining ?? club.capacity - club.seatsFilled
            const isFull = remaining <= 0
            const percentFilled = Math.min(100, Math.round((club.seatsFilled / club.capacity) * 100))

            return (
              <div
                key={club._id}
                className={`bg-white rounded-xl border p-5 transition-all flex flex-col justify-between ${
                  isAllocatedToThis
                    ? 'border-emerald-500 ring-2 ring-emerald-500/20 shadow-md'
                    : isFull
                    ? 'border-gray-200 bg-gray-50/70 opacity-75'
                    : 'border-gray-200 hover:border-purple-300 hover:shadow-md'
                }`}
              >
                <div>
                  <div className="flex justify-between items-start gap-2 mb-2">
                    <span className="text-xs font-bold tracking-wider text-purple-600 bg-purple-50 px-2 py-0.5 rounded">
                      {club.code}
                    </span>
                    {isAllocatedToThis && (
                      <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
                        ✓ Your Club
                      </span>
                    )}
                  </div>

                  <h3 className="text-base font-bold text-gray-900 leading-snug">{club.name}</h3>

                  {/* Target Program Badges */}
                  {club.targetBranches && club.targetBranches.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {club.targetBranches.map((branch) => (
                        <span key={branch} className="text-[10px] font-semibold px-1.5 py-0.5 bg-purple-50 text-purple-700 border border-purple-200 rounded">
                          {branch}
                        </span>
                      ))}
                    </div>
                  )}

                  {club.coordinatorName && (
                    <div className="mt-3 text-xs text-gray-600 bg-gray-50 p-2.5 rounded-lg border border-gray-100">
                      <span className="font-semibold text-gray-800">Coordinator:</span> {club.coordinatorName}
                      {club.coordinatorContact && <span> ({club.coordinatorContact})</span>}
                    </div>
                  )}
                </div>

                {/* Capacity & Action */}
                <div className="mt-4 pt-3 border-t border-gray-100 space-y-3">
                  <div>
                    <div className="flex justify-between text-xs font-medium text-gray-600 mb-1">
                      <span>Seats: {club.seatsFilled} / {club.capacity}</span>
                      <span className={isFull ? 'text-red-600 font-bold' : 'text-emerald-600 font-semibold'}>
                        {isFull ? 'FULL' : `${remaining} left`}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-2 rounded-full transition-all duration-500 ${
                          isFull ? 'bg-red-500' : percentFilled >= 80 ? 'bg-amber-500' : 'bg-purple-600'
                        }`}
                        style={{ width: `${percentFilled}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {club.syllabusUrl && (
                      <a
                        href={club.syllabusUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-purple-600 hover:text-purple-800 font-medium px-2 py-1"
                      >
                        Info ↗
                      </a>
                    )}

                    <Button
                      onClick={() => handleSelectClub(club)}
                      disabled={
                        isAllocatedToThis ||
                        isCategoryAllocated ||
                        isFull ||
                        !isWindowOpen ||
                        allocatingId === club._id
                      }
                      variant={isAllocatedToThis ? 'secondary' : 'primary'}
                      className="w-full bg-purple-600 hover:bg-purple-700"
                      size="sm"
                    >
                      {allocatingId === club._id
                        ? 'Allocating...'
                        : isAllocatedToThis
                        ? 'Confirmed ✓'
                        : isCategoryAllocated
                        ? 'Category Selected'
                        : isFull
                        ? 'Club Full'
                        : 'Select Club'}
                    </Button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Confirmation Modal */}
      {confirmClub && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5 animate-fadeIn">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center text-2xl mx-auto">
                {confirmClub.category === 'co-curricular' ? '🎓' : '🎨'}
              </div>
              <h3 className="text-lg font-bold text-gray-900">
                Confirm Club Selection
              </h3>
              <p className="text-xs text-gray-500">
                Please verify your selection before confirming allotment.
              </p>
            </div>

            <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-500">Club Name:</span>
                <span className="font-bold text-gray-900">{confirmClub.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Code:</span>
                <span className="font-mono font-semibold text-indigo-600">{confirmClub.code}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Category:</span>
                <span className="font-semibold text-gray-800 capitalize">
                  {confirmClub.category.replace('-', ' ')} Club
                </span>
              </div>
              {confirmClub.coordinatorName && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Coordinator:</span>
                  <span className="text-gray-700 font-medium">{confirmClub.coordinatorName}</span>
                </div>
              )}
            </div>

            <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-[11px] text-amber-800 space-y-1">
              <p className="font-semibold">⚠️ Important Allocation Rule:</p>
              <p>
                First-Year students can select <strong>only one</strong> {confirmClub.category.replace('-', ' ')} club for this semester. Allotment is processed instantly on a First-Come, First-Served basis and cannot be changed by the student once locked.
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => setConfirmClub(null)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"
                onClick={handleConfirmAllocation}
              >
                Yes, Confirm Selection
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
