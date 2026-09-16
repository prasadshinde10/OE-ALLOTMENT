'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import api from '@/lib/api'
import { useAuthContext } from '@/context/AuthContext'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Skeleton } from '@/components/ui/Skeleton'
import toast from 'react-hot-toast'

const DIVISION_OPTIONS = Array.from({ length: 26 }, (_, i) => {
  const char = String.fromCharCode(65 + i)
  return { value: char, label: `Division ${char}` }
})

export default function StudentOnboardingPage() {
  const router = useRouter()
  const { user, login } = useAuthContext()
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)
  const [branches, setBranches] = useState<any[]>([])
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmModal, setShowConfirmModal] = useState(false)

  const [verifiedEmail, setVerifiedEmail] = useState('')

  const [formData, setFormData] = useState({
    firstName: '',
    middleName: '',
    lastName: '',
    hallTicketNumber: '',
    mobileNumber: '',
    year: '3',
    semester: 'Sem-5',
    branch: '',
    division: 'A',
    rollNumber: '',
    password: '',
  })

  // Load student profile & pre-fill email
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await api.get('/api/auth/me')
        const profile = res.data.data
        if (profile) {
          setVerifiedEmail(profile.instituteEmail || user?.email || '')

          // If already completed profile, redirect straight to dashboard
          if (profile.isProfileComplete && profile.hallTicketNumber) {
            router.replace('/student/status')
            return
          }

          setFormData(prev => ({
            ...prev,
            firstName: profile.firstName || '',
            middleName: profile.middleName || '',
            lastName: profile.lastName || '',
            hallTicketNumber: profile.hallTicketNumber || '',
            mobileNumber: profile.mobileNumber || '',
            branch: profile.branch && profile.branch !== 'General' ? profile.branch : '',
            semester: profile.semester || 'Sem-5',
            division: profile.division || 'A',
            rollNumber: profile.rollNumber || '',
            year: String(profile.year || '3'),
          }))
        }
      } catch (err) {
        if (user) {
          setVerifiedEmail(user.email || '')
        }
      } finally {
        setFetching(false)
      }
    }

    fetchProfile()
  }, [user, router])

  // Fetch branches whenever year changes
  useEffect(() => {
    const fetchBranches = async () => {
      try {
        const endpoint = formData.year === '1' ? '/api/fy-branches' : `/api/auth/branches?year=${formData.year}`
        const res = await api.get(endpoint)
        setBranches(res.data.data || [])
      } catch (err) {
        setBranches([])
      }
    }
    fetchBranches()
  }, [formData.year])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    if (name === 'year') {
      // Auto-set valid semester when year changes
      const validSemesters = getSemesterOptions(value)
      const currentSemValid = validSemesters.some(s => s.value === formData.semester)
      setFormData({
        ...formData,
        year: value,
        semester: currentSemValid ? formData.semester : validSemesters[0]?.value || 'Sem-3',
      })
    } else {
      setFormData({ ...formData, [name]: value })
    }
  }

  const getSemesterOptions = (year: string) => {
    if (year === '1') return [
      { value: 'Sem-1', label: '1st Semester' },
      { value: 'Sem-2', label: '2nd Semester' },
    ]
    if (year === '2') return [
      { value: 'Sem-3', label: '3rd Semester' },
      { value: 'Sem-4', label: '4th Semester' },
    ]
    // year === '3' (default)
    return [
      { value: 'Sem-5', label: '5th Semester' },
      { value: 'Sem-6', label: '6th Semester' },
    ]
  }

  const validate = () => {
    if (!formData.firstName.trim()) {
      toast.error('First Name is required')
      return false
    }
    if (!formData.lastName.trim()) {
      toast.error('Last Name is required')
      return false
    }
    const isFY = formData.year === '1'
    if (!isFY && !/^\d{12}$/.test(formData.hallTicketNumber.trim())) {
      toast.error('Hall Ticket / PRN must be exactly 12 digits')
      return false
    }
    if (!/^[6-9]\d{9}$/.test(formData.mobileNumber.trim())) {
      toast.error('Mobile Number must be a valid 10-digit number')
      return false
    }
    if (!formData.branch) {
      toast.error('Please select your Department / Branch')
      return false
    }
    if (!formData.division) {
      toast.error('Please select your Class Division')
      return false
    }
    if (!formData.rollNumber.trim()) {
      toast.error('Please enter your Class Roll Number')
      return false
    }
    return true
  }

  const handleOpenConfirm = (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    setShowConfirmModal(true)
  }

  const handleFinalSubmit = async () => {
    try {
      setLoading(true)
      const res = await api.post('/api/auth/complete-profile', {
        ...formData,
        firstName: formData.firstName.trim(),
        middleName: formData.middleName.trim(),
        lastName: formData.lastName.trim(),
        hallTicketNumber: formData.hallTicketNumber.trim(),
        mobileNumber: formData.mobileNumber.trim(),
        division: formData.division.trim(),
        rollNumber: formData.rollNumber.trim(),
      })

      if (res.data.token) {
        login(res.data.token, res.data.student)
      }

      setShowConfirmModal(false)
      toast.success('Registration finalized successfully!')
      router.replace('/student/status')
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to complete registration')
    } finally {
      setLoading(false)
    }
  }

  if (fetching) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 animate-fadeIn">
        <div className="sm:mx-auto sm:w-full sm:max-w-xl bg-white p-8 rounded-2xl shadow-md space-y-6">
          <Skeleton className="h-8 w-64 mx-auto" />
          <Skeleton className="h-4 w-80 mx-auto" />
          <div className="space-y-4 pt-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-xl">
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold rounded-full mb-3">
            <span>Verified with Microsoft Entra ID</span>
          </div>
          <h2 className="text-3xl font-extrabold text-gray-900">Complete Student Registration</h2>
          <p className="mt-2 text-sm text-gray-600">
            Please enter your official student name and academic details
          </p>
        </div>

        <div className="bg-white py-8 px-6 shadow-xl rounded-2xl sm:px-10 border border-gray-100">
          <form className="space-y-5" onSubmit={handleOpenConfirm}>
            {/* Verified Email Banner */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Verified Microsoft Email
                </span>
                <span className="text-xs text-emerald-600 font-medium">Verified</span>
              </div>
              <input
                type="text"
                value={verifiedEmail}
                readOnly
                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-800 font-medium cursor-not-allowed select-none shadow-sm"
              />
            </div>

            {/* Three Distinct Name Fields */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700">
                Student Full Name
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Input
                  label="First Name"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  required
                  placeholder="e.g. Prasad"
                />

                <Input
                  label="Middle Name"
                  name="middleName"
                  value={formData.middleName}
                  onChange={handleChange}
                  placeholder="e.g. Sahebrao (optional)"
                />

                <Input
                  label="Last Name"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  required
                  placeholder="e.g. Shinde"
                />
              </div>
            </div>

            {/* Mandatory Student Inputs */}
            <div className={`grid grid-cols-1 ${formData.year === '1' ? 'sm:grid-cols-1' : 'sm:grid-cols-2'} gap-4`}>
              {formData.year !== '1' && (
                <Input
                  label="Hall Ticket / PRN (12 digits)"
                  name="hallTicketNumber"
                  value={formData.hallTicketNumber}
                  onChange={handleChange}
                  required
                  maxLength={12}
                  placeholder="e.g. 202201010001"
                />
              )}

              <Input
                label="Mobile Phone Number"
                name="mobileNumber"
                value={formData.mobileNumber}
                onChange={handleChange}
                required
                maxLength={10}
                placeholder="10-digit number"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Academic Year</label>
                <select
                  name="year"
                  value={formData.year}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-600 focus:border-teal-600"
                  required
                >
                  <option value="1">1st Year (FY)</option>
                  <option value="2">2nd Year (SY)</option>
                  <option value="3">3rd Year (TY)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Semester</label>
                <select
                  name="semester"
                  value={formData.semester}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-600 focus:border-teal-600"
                  required
                >
                  {getSemesterOptions(formData.year).map((sem) => (
                    <option key={sem.value} value={sem.value}>
                      {sem.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Department / Branch</label>
                <select
                  name="branch"
                  value={formData.branch}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-600 focus:border-teal-600"
                  required
                >
                  <option value="" disabled>Select Department</option>
                  {branches.length > 0 ? (
                    branches.map((b) => (
                      <option key={b._id || b.name} value={b.name}>
                        {b.name}
                      </option>
                    ))
                  ) : formData.year === '1' ? (
                    <>
                      <option value="FY-CSE">FY-CSE</option>
                      <option value="FY-CSD">FY-CSD</option>
                      <option value="FY-AI&DS">FY-AI&DS</option>
                      <option value="FY-MECH">FY-MECH</option>
                    </>
                  ) : (
                    <>
                      <option value="Computer Science and Engineering">Computer Science and Engineering</option>
                      <option value="Information Technology">Information Technology</option>
                      <option value="Electronics and Telecommunication">Electronics and Telecommunication</option>
                      <option value="Mechanical Engineering">Mechanical Engineering</option>
                      <option value="Civil Engineering">Civil Engineering</option>
                      <option value="Electrical Engineering">Electrical Engineering</option>
                    </>
                  )}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Class Division</label>
                <select
                  name="division"
                  value={formData.division}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-600 focus:border-teal-600"
                  required
                >
                  {DIVISION_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <Input
                label="Class Roll Number"
                name="rollNumber"
                value={formData.rollNumber}
                onChange={handleChange}
                required
                placeholder="e.g. 42"
              />
            </div>

            {/* Optional local password */}
            <div className="relative">
              <Input
                label="Set Password (Optional for direct login)"
                type={showPassword ? 'text' : 'password'}
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Optional (min 6 characters)"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-8 text-xs font-semibold text-gray-500 hover:text-gray-700 select-none py-1 px-2"
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>

            <div className="pt-2">
              <Button type="submit" className="w-full py-3" disabled={loading}>
                Submit Registration
              </Button>
            </div>
          </form>
        </div>
      </div>

      {/* Confirmation & Submission Warning Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 border border-gray-200">
            <div>
              <h3 className="text-lg font-bold text-gray-900">Confirm Your Registration</h3>
              <p className="text-xs text-gray-500 mt-0.5">Please review your academic details before final submission.</p>
            </div>

            {/* Mandatory Warning Banner */}
            <div className="p-4 bg-amber-50 border border-amber-300 rounded-xl text-amber-900 text-sm">
              <p className="font-semibold text-amber-950">
                Important: This cannot be changed after submitting. Please recheck your data carefully.
              </p>
            </div>

            {/* Details Summary Table */}
            <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 text-xs space-y-2">
              <div className="flex justify-between py-1 border-b border-gray-200">
                <span className="text-gray-500 font-medium">Full Name:</span>
                <span className="font-semibold text-gray-900">
                  {`${formData.firstName} ${formData.middleName || ''} ${formData.lastName}`.replace(/\s+/g, ' ').trim()}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-200">
                <span className="text-gray-500 font-medium">Email:</span>
                <span className="font-semibold text-teal-700 font-mono">{verifiedEmail}</span>
              </div>
              {formData.year !== '1' && (
                <div className="flex justify-between py-1 border-b border-gray-200">
                  <span className="text-gray-500 font-medium">Hall Ticket / PRN:</span>
                  <span className="font-semibold text-gray-900 font-mono">{formData.hallTicketNumber}</span>
                </div>
              )}
              <div className="flex justify-between py-1 border-b border-gray-200">
                <span className="text-gray-500 font-medium">Mobile Number:</span>
                <span className="font-semibold text-gray-900 font-mono">{formData.mobileNumber}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-200">
                <span className="text-gray-500 font-medium">Class & Semester:</span>
                <span className="font-semibold text-gray-900">
                  {formData.year === '1' ? '1st Year (FY)' : formData.year === '2' ? '2nd Year (SY)' : '3rd Year (TY)'} • {formData.semester}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-200">
                <span className="text-gray-500 font-medium">Department / Branch:</span>
                <span className="font-semibold text-gray-900">{formData.branch}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-200">
                <span className="text-gray-500 font-medium">Division of Class:</span>
                <span className="font-semibold text-teal-700 font-medium">Division {formData.division}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-gray-500 font-medium">Class Roll Number:</span>
                <span className="font-semibold text-gray-900 font-mono">{formData.rollNumber}</span>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowConfirmModal(false)}
                disabled={loading}
              >
                Go Back
              </Button>
              <Button
                type="button"
                onClick={handleFinalSubmit}
                disabled={loading}
                className="bg-teal-600 hover:bg-teal-700 text-white"
              >
                {loading ? 'Submitting...' : 'Confirm & Submit'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
