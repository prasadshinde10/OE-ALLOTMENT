'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import api from '@/lib/api'
import { useAuthContext } from '@/context/AuthContext'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import toast from 'react-hot-toast'

export default function StudentLoginPage() {
  const router = useRouter()
  const { login } = useAuthContext()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    email: '',
    hallTicketNumber: ''
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!/^\d{12}$/.test(formData.hallTicketNumber)) {
      toast.error('Hall Ticket Number must be 12 digits')
      return
    }

    try {
      setLoading(true)
      const res = await api.post('/api/auth/student/login', formData)
      login(res.data.token, res.data.user)
      toast.success('Login successful')
      router.push('/student/status')
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Invalid credentials or student not found')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">Student Login</h2>
        <p className="mt-2 text-center text-sm text-gray-600">For already registered students</p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <form className="space-y-6" onSubmit={handleSubmit}>
            <Input label="Institute Email" type="email" name="email" value={formData.email} onChange={handleChange} required />
            <Input label="Hall Ticket Number" type="text" name="hallTicketNumber" value={formData.hallTicketNumber} onChange={handleChange} required maxLength={12} />

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Logging in...' : 'Sign In'}
            </Button>
            
            <div className="mt-4 text-center">
              <a href="/register" className="text-sm text-indigo-600 hover:text-indigo-500">
                Not registered yet? Click here to register.
              </a>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
