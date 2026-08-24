'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import api from '@/lib/api'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import toast from 'react-hot-toast'
import Link from 'next/link'

export default function RegisterPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [branches, setBranches] = useState<any[]>([])
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [formData, setFormData] = useState({
    hallTicketNumber: '',
    firstName: '',
    middleName: '',
    lastName: '',
    instituteEmail: '',
    mobileNumber: '',
    password: '',
    confirmPassword: '',
    rollNumber: '',
    year: '1',
    semester: 'Sem-1',
    branch: ''
  })

  useEffect(() => {
    fetchBranches(formData.year)
    // reset branch selection when year changes
    setFormData(prev => ({ ...prev, branch: '' }))
  }, [formData.year])

  const fetchBranches = async (year: string) => {
    try {
      const res = await api.get(`/api/auth/branches?year=${year}`)
      setBranches(res.data.data || [])
    } catch (err) {
      setBranches([])
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const validate = () => {
    if (!formData.instituteEmail.endsWith('@mit.asia')) {
      toast.error('Email must be an @mit.asia domain')
      return false
    }
    if (!/^\d{12}$/.test(formData.hallTicketNumber)) {
      toast.error('Hall Ticket Number must be exactly 12 digits')
      return false
    }
    if (!/^[6-9]\d{9}$/.test(formData.mobileNumber)) {
      toast.error('Invalid Indian mobile number')
      return false
    }
    if (formData.password.length < 6) {
      toast.error('Password must be at least 6 characters long')
      return false
    }
    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match')
      return false
    }
    if (!formData.branch) {
      toast.error('Please select a branch')
      return false
    }
    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    try {
      setLoading(true)
      const { confirmPassword, ...submitData } = formData
      const res = await api.post('/api/auth/register', submitData)
      toast.success('Registration successful. OTP sent to your email.')
      // redirect to verify-otp with studentId and email
      const email = encodeURIComponent(formData.instituteEmail)
      const studentId = res.data.data?._id || res.data.studentId || ''
      router.push(`/verify-otp?email=${email}&studentId=${studentId}`)
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to register. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">Student Registration</h2>
        <p className="mt-2 text-center text-sm text-gray-600">Register for Open Elective Allotment</p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <form className="space-y-6" onSubmit={handleSubmit}>
            <Input label="Hall Ticket Number (12 digits)" name="hallTicketNumber" value={formData.hallTicketNumber} onChange={handleChange} required maxLength={12} placeholder="e.g. 123456789012" />
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input label="First Name" name="firstName" value={formData.firstName} onChange={handleChange} required />
              <Input label="Middle Name" name="middleName" value={formData.middleName} onChange={handleChange} />
              <Input label="Last Name" name="lastName" value={formData.lastName} onChange={handleChange} required />
            </div>

            <Input label="Institute Email (@mit.asia)" type="email" name="instituteEmail" value={formData.instituteEmail} onChange={handleChange} required placeholder="student@mit.asia" />
            <Input label="Mobile Number" name="mobileNumber" value={formData.mobileNumber} onChange={handleChange} required maxLength={10} placeholder="10 digit number" />
            
            <div className="relative">
              <Input label="Password" type={showPassword ? 'text' : 'password'} name="password" value={formData.password} onChange={handleChange} required />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-8 text-gray-500 hover:text-gray-700 text-sm select-none">
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
            <div className="relative">
              <Input label="Confirm Password" type={showConfirmPassword ? 'text' : 'password'} name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} required />
              <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-8 text-gray-500 hover:text-gray-700 text-sm select-none">
                {showConfirmPassword ? '🙈' : '👁️'}
              </button>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">Year</label>
              <select name="year" value={formData.year} onChange={handleChange} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md border" required>
                <option value="1">1st Year</option>
                <option value="2">2nd Year</option>
                <option value="3">3rd Year</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Semester</label>
              <select name="semester" value={formData.semester} onChange={handleChange} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md border" required>
                {Array.from({ length: 8 }, (_, i) => (
                  <option key={`sem-${i+1}`} value={`Sem-${i+1}`}>Sem-{i+1}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Branch</label>
              <select name="branch" value={formData.branch} onChange={handleChange} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md border" required>
                <option value="" disabled>Select Branch</option>
                {branches.length > 0 ? branches.map(b => (
                  <option key={b._id} value={b.name}>{b.name}</option>
                )) : (
                  <option value="" disabled>No branches available for this year</option>
                )}
              </select>
            </div>

            <Input label="Roll Number" name="rollNumber" value={formData.rollNumber} onChange={handleChange} required />

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Registering...' : 'Register & Send OTP'}
            </Button>
            
            <div className="mt-4 text-center">
              <Link href="/" className="text-sm text-indigo-600 hover:text-indigo-500">
                Already registered? Login here
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
