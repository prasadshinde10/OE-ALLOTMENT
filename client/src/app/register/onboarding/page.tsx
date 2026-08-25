'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import api from '@/lib/api'
import { useAuthContext } from '@/context/AuthContext'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import toast from 'react-hot-toast'

export default function StudentOnboardingPage() {
  const router = useRouter()
  const { user, login } = useAuthContext()
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)
  const [branches, setBranches] = useState<any[]>([])
  const [showPassword, setShowPassword] = useState(false)

  const [studentInfo, setStudentInfo] = useState({
    fullName: '',
    instituteEmail: '',
  })

  const [formData, setFormData] = useState({
    hallTicketNumber: '',
    mobileNumber: '',
    year: '3',
    semester: 'Sem-5',
    branch: '',
    rollNumber: '',
    password: '',
  })

  // Load student profile & pre-fill verified name and email
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await api.get('/api/auth/me')
        const profile = res.data.data
        if (profile) {
          setStudentInfo({
            fullName: profile.fullName || user?.name || '',
            instituteEmail: profile.instituteEmail || user?.email || '',
          })

          // If already completed profile, redirect straight to dashboard
          if (profile.isProfileComplete && profile.hallTicketNumber) {
            router.replace('/student/status')
            return
          }

          setFormData(prev => ({
            ...prev,
            hallTicketNumber: profile.hallTicketNumber || '',
            mobileNumber: profile.mobileNumber || '',
            branch: profile.branch && profile.branch !== 'General' ? profile.branch : '',
            semester: profile.semester || 'Sem-5',
            rollNumber: profile.rollNumber || '',
            year: String(profile.year || '3'),
          }))
        }
      } catch (err) {
        // Fallback to auth context
        if (user) {
          setStudentInfo({
            fullName: user.name || '',
            instituteEmail: user.email || '',
          })
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
        const res = await api.get(`/api/auth/branches?year=${formData.year}`)
        setBranches(res.data.data || [])
      } catch (err) {
        setBranches([])
      }
    }
    fetchBranches()
  }, [formData.year])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const validate = () => {
    if (!/^\d{12}$/.test(formData.hallTicketNumber.trim())) {
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
    if (!formData.rollNumber.trim()) {
      toast.error('Please enter your Class Roll Number')
      return false
    }
    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    try {
      setLoading(true)
      const res = await api.post('/api/auth/complete-profile', {
        ...formData,
        hallTicketNumber: formData.hallTicketNumber.trim(),
        mobileNumber: formData.mobileNumber.trim(),
        rollNumber: formData.rollNumber.trim(),
      })

      if (res.data.token) {
        login(res.data.token, res.data.student)
      }

      toast.success('Registration finalized! Welcome to OE Allotment')
      router.replace('/student/status')
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to complete registration')
    } finally {
      setLoading(false)
    }
  }

  if (fetching) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <LoadingSpinner />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-xl">
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold rounded-full mb-3">
            <span>✓ Verified with Microsoft Entra ID</span>
          </div>
          <h2 className="text-3xl font-extrabold text-gray-900">Complete Student Details</h2>
          <p className="mt-2 text-sm text-gray-600">
            Please fill in your academic information to finalize registration
          </p>
        </div>

        <div className="bg-white py-8 px-6 shadow-xl rounded-2xl sm:px-10 border border-gray-100">
          <form className="space-y-5" onSubmit={handleSubmit}>
            {/* Read-Only Verified Details */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Verified Identity
                </span>
                <span className="text-xs text-slate-400">🔒 Read-only</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Full Name</label>
                  <input
                    type="text"
                    value={studentInfo.fullName || 'Verified Student'}
                    readOnly
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-800 font-medium cursor-not-allowed select-none shadow-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Institute Email</label>
                  <input
                    type="text"
                    value={studentInfo.instituteEmail}
                    readOnly
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-800 font-medium cursor-not-allowed select-none shadow-sm"
                  />
                </div>
              </div>
            </div>

            {/* Mandatory Student Inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Hall Ticket / PRN Number (12 digits)"
                name="hallTicketNumber"
                value={formData.hallTicketNumber}
                onChange={handleChange}
                required
                maxLength={12}
                placeholder="e.g. 202201010001"
              />

              <Input
                label="Mobile Phone Number"
                name="mobileNumber"
                value={formData.mobileNumber}
                onChange={handleChange}
                required
                maxLength={10}
                placeholder="10-digit mobile number"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Academic Year</label>
                <select
                  name="year"
                  value={formData.year}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  required
                >
                  <option value="1">1st Year</option>
                  <option value="2">2nd Year</option>
                  <option value="3">3rd Year</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Semester</label>
                <select
                  name="semester"
                  value={formData.semester}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  required
                >
                  {Array.from({ length: 8 }, (_, i) => (
                    <option key={`sem-${i + 1}`} value={`Sem-${i + 1}`}>
                      Sem-{i + 1}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Department / Branch</label>
                <select
                  name="branch"
                  value={formData.branch}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  required
                >
                  <option value="" disabled>Select Department / Branch</option>
                  {branches.length > 0 ? (
                    branches.map((b) => (
                      <option key={b._id || b.name} value={b.name}>
                        {b.name}
                      </option>
                    ))
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
                label="Set Password (Optional for fallback login)"
                type={showPassword ? 'text' : 'password'}
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Optional (min 6 characters)"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-8 text-gray-500 hover:text-gray-700 text-sm select-none"
              >
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>

            <div className="pt-2">
              <Button type="submit" className="w-full py-3" disabled={loading}>
                {loading ? 'Saving Details...' : 'Complete Registration & Continue'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
