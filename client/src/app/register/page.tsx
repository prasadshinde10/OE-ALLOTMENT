'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import api from '@/lib/api'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import toast from 'react-hot-toast'

export default function RegisterPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    hallTicketNumber: '',
    name: '',
    instituteEmail: '',
    mobileNumber: '',
    class: '',
    rollNumber: '',
    year: '1'
  })

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
    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    try {
      setLoading(true)
      await api.post('/api/auth/send-otp', formData)
      toast.success('OTP sent to your email')
      router.push(`/verify-otp?email=${encodeURIComponent(formData.instituteEmail)}`)
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
            <Input label="Full Name" name="name" value={formData.name} onChange={handleChange} required />
            <Input label="Institute Email (@mit.asia)" type="email" name="instituteEmail" value={formData.instituteEmail} onChange={handleChange} required placeholder="student@mit.asia" />
            <Input label="Mobile Number" name="mobileNumber" value={formData.mobileNumber} onChange={handleChange} required maxLength={10} placeholder="10 digit number" />
            <Input label="Class (e.g. CS-A)" name="class" value={formData.class} onChange={handleChange} required />
            <Input label="Roll Number" name="rollNumber" value={formData.rollNumber} onChange={handleChange} required />
            
            <div>
              <label className="block text-sm font-medium text-gray-700">Year</label>
              <select name="year" value={formData.year} onChange={handleChange} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md border" required>
                <option value="1">1st Year</option>
                <option value="2">2nd Year</option>
                <option value="3">3rd Year</option>
              </select>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Sending OTP...' : 'Register & Send OTP'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
