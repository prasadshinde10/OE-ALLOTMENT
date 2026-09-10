'use client'

import { useState, useEffect } from 'react'
import api from '@/lib/api'
import { useAuthContext } from '@/context/AuthContext'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Skeleton } from '@/components/ui/Skeleton'
import toast from 'react-hot-toast'

const APPROVED_DEPARTMENTS = [
  'Computer Science and Engineering',
  'Computer Science and Design',
  'Artificial Intelligence and Data Science',
  'Mechanical Engineering',
  'Civil Engineering',
  'Electronics and Telecommunication',
]

export default function StudentProfilePage() {
  const { user, login } = useAuthContext()
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)
  const [branches, setBranches] = useState<any[]>([])
  const [isRegistrationPhaseActive, setIsRegistrationPhaseActive] = useState(true)

  const [formData, setFormData] = useState({
    firstName: '',
    middleName: '',
    lastName: '',
    instituteEmail: '',
    hallTicketNumber: '',
    mobileNumber: '',
    branch: '',
    semester: 'Sem-1',
    rollNumber: '',
    year: 1,
  })

  useEffect(() => {
    fetchProfile()
    fetchBranches()
  }, [])

  const fetchProfile = async () => {
    try {
      setFetching(true)
      const res = await api.get('/api/auth/me')
      const profile = res.data.data
      if (profile) {
        const studentYear = profile.year || 1
        setFormData({
          firstName: profile.firstName || '',
          middleName: profile.middleName || '',
          lastName: profile.lastName || '',
          instituteEmail: profile.instituteEmail || '',
          hallTicketNumber: profile.hallTicketNumber || '',
          mobileNumber: profile.mobileNumber || '',
          branch: profile.branch || '',
          semester: profile.semester || 'Sem-1',
          rollNumber: profile.rollNumber || '',
          year: studentYear,
        })
        fetchBranches(studentYear)

        // Fetch Registration Phase & Lock Status
        try {
          const regRes = await api.get(`/api/student/registration-phase?year=${studentYear}`)
          if (regRes.data?.data) {
            setIsRegistrationPhaseActive(regRes.data.data.isPhaseActive !== false)
          }
        } catch (regErr) {
          // Fallback to my-term-config check
          try {
            const configRes = await api.get('/api/club-allocation/my-term-config')
            const cfg = configRes.data?.data
            if (cfg && cfg.isRegistrationActive === false) {
              setIsRegistrationPhaseActive(false)
            }
          } catch (e) {
            // Keep default active
          }
        }
      }
    } catch (err) {
      toast.error('Failed to load profile details')
    } finally {
      setFetching(false)
    }
  }

  const fetchBranches = async (targetYear?: number) => {
    try {
      const yr = targetYear !== undefined ? Number(targetYear) : Number(formData.year)
      const endpoint = yr === 1 ? '/api/fy-branches' : `/api/branches?year=${yr}`
      const res = await api.get(endpoint)
      setBranches(res.data.data || [])
    } catch (err) {
      setBranches([])
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    if (!isRegistrationPhaseActive) return
    const { name, value } = e.target
    if (name === 'year') {
      const yr = Number(value)
      setFormData((prev) => ({ ...prev, year: yr }))
      fetchBranches(yr)
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }))
    }
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
    if (formData.mobileNumber && !/^[6-9]\d{9}$/.test(formData.mobileNumber.trim())) {
      toast.error('Mobile Number must be a valid 10-digit Indian phone number (starting with 6-9)')
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
    if (!isRegistrationPhaseActive) {
      toast.error('Profile editing is currently locked by FY Admin.')
      return
    }
    if (!validate()) return

    try {
      setLoading(true)
      const res = await api.put('/api/auth/profile', {
        firstName: formData.firstName.trim(),
        middleName: formData.middleName.trim(),
        lastName: formData.lastName.trim(),
        mobileNumber: formData.mobileNumber.trim(),
        branch: formData.branch,
        semester: formData.semester,
        rollNumber: formData.rollNumber.trim(),
        year: Number(formData.year),
      })

      if (res.data.token) {
        login(res.data.token, res.data.data)
      }

      toast.success('Profile updated successfully!')
    } catch (err: any) {
      if (err.response?.status === 403) {
        toast.error(err.response.data.message || 'Profile editing is currently locked by FY Admin.')
        setIsRegistrationPhaseActive(false)
      } else if (err.response?.status === 409) {
        toast.error(err.response.data.message || 'Duplicate Roll Number or Mobile Number conflict.')
      } else {
        toast.error(err.response?.data?.message || 'Failed to update profile')
      }
    } finally {
      setLoading(false)
    }
  }

  if (fetching) {
    return (
      <div className="max-w-2xl mx-auto py-12 space-y-4">
        <Skeleton className="h-8 w-48 mx-auto" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-5 bg-gray-50 border-b border-gray-200">
          <div className="flex justify-between items-start sm:items-center">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Student Profile & Settings</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Manage your personal and academic information. Institute email and PRN are permanent credentials.
              </p>
            </div>
            {!isRegistrationPhaseActive && (
              <span className="text-xs font-bold px-3 py-1 bg-red-100 text-red-800 rounded-full">
                🔒 Editing Locked
              </span>
            )}
          </div>
        </div>

        {/* Closed Phase Warning Banner */}
        {!isRegistrationPhaseActive && (
          <div className="mx-6 mt-6 p-4 bg-amber-50 border border-amber-300 rounded-xl text-amber-900 text-sm flex items-start gap-3 shadow-sm">
            <span className="text-xl flex-shrink-0">⚠️</span>
            <div>
              <h4 className="font-bold text-amber-950 text-sm">
                Profile Registration Phase is Closed
              </h4>
              <p className="text-xs text-amber-800 mt-0.5">
                Profile editing is currently locked by FY Admin. Contact your First-Year Administrator to request changes.
              </p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Read-only Credentials Banner */}
          <div className={`grid grid-cols-1 ${formData.year === 1 ? 'sm:grid-cols-1' : 'sm:grid-cols-2'} gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200/80`}>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Institute Email (Primary ID)
                </label>
                <span className="text-[10px] text-emerald-600 font-semibold">🔒 Permanent</span>
              </div>
              <input
                type="text"
                value={formData.instituteEmail}
                readOnly
                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-800 font-medium cursor-not-allowed select-none"
              />
            </div>

            {formData.year !== 1 && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Hall Ticket / PRN
                  </label>
                  <span className="text-[10px] text-slate-400 font-semibold">Permanent</span>
                </div>
                <input
                  type="text"
                  value={formData.hallTicketNumber || 'N/A'}
                  readOnly
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-800 font-medium cursor-not-allowed select-none"
                />
              </div>
            )}
          </div>

          {/* Three Name Fields */}
          <div className="space-y-1">
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
                disabled={!isRegistrationPhaseActive}
              />
              <Input
                label="Middle Name"
                name="middleName"
                value={formData.middleName}
                onChange={handleChange}
                placeholder="(optional)"
                disabled={!isRegistrationPhaseActive}
              />
              <Input
                label="Last Name"
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                required
                disabled={!isRegistrationPhaseActive}
              />
            </div>
          </div>

          {/* Mobile & Roll Number */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Mobile Phone Number"
              name="mobileNumber"
              value={formData.mobileNumber}
              onChange={handleChange}
              maxLength={10}
              placeholder="10-digit number"
              disabled={!isRegistrationPhaseActive}
            />
            <Input
              label="Class Roll Number"
              name="rollNumber"
              value={formData.rollNumber}
              onChange={handleChange}
              required
              placeholder="e.g. 42"
              disabled={!isRegistrationPhaseActive}
            />
          </div>

          {/* Academic Dept, Year & Semester */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Department / Branch</label>
              <select
                name="branch"
                value={formData.branch}
                onChange={handleChange}
                disabled={!isRegistrationPhaseActive}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-600 disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed"
                required
              >
                <option value="">Select Department / Branch</option>
                {formData.branch && !branches.some((b) => b.name === formData.branch) && (
                  <option value={formData.branch}>{formData.branch}</option>
                )}
                {branches.map((b) => (
                  <option key={b._id || b.name} value={b.name}>
                    {b.name}
                  </option>
                ))}
                {branches.length === 0 && !formData.branch && (
                  APPROVED_DEPARTMENTS.map((dept) => (
                    <option key={dept} value={dept}>
                      {dept}
                    </option>
                  ))
                )}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Academic Year</label>
              <select
                name="year"
                value={formData.year}
                onChange={handleChange}
                disabled={!isRegistrationPhaseActive}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-600 disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed"
                required
              >
                <option value={1}>1st Year (FY)</option>
                <option value={2}>2nd Year (SY)</option>
                <option value={3}>3rd Year (TY)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Semester / Class</label>
              <select
                name="semester"
                value={formData.semester}
                onChange={handleChange}
                disabled={!isRegistrationPhaseActive}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-600 disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed"
                required
              >
                <option value="Sem-1">Sem-1 (1st Sem)</option>
                <option value="Sem-2">Sem-2 (2nd Sem)</option>
                <option value="Sem-3">Sem-3 (3rd Sem)</option>
                <option value="Sem-4">Sem-4 (4th Sem)</option>
                <option value="Sem-5">Sem-5 (5th Sem)</option>
                <option value="Sem-6">Sem-6 (6th Sem)</option>
              </select>
            </div>
          </div>

          <div className="pt-4 border-t flex justify-end">
            <Button
              type="submit"
              disabled={loading || !isRegistrationPhaseActive}
              className={`px-6 py-2.5 font-semibold ${
                !isRegistrationPhaseActive
                  ? 'bg-gray-200 text-gray-500 border border-gray-300 hover:bg-gray-200 cursor-not-allowed shadow-none'
                  : ''
              }`}
            >
              {loading
                ? 'Saving Profile...'
                : !isRegistrationPhaseActive
                ? '🔒 Profile Editing Locked'
                : 'Save Changes'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
