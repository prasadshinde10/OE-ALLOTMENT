'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import api from '@/lib/api'
import { useAuthContext } from '@/context/AuthContext'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import toast from 'react-hot-toast'
import Link from 'next/link'

export default function AdminLoginPage() {
  const router = useRouter()
  const { login } = useAuthContext()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setLoading(true)
      const res = await api.post('/api/auth/admin/login', formData)
      login(res.data.token, res.data.user)
      toast.success('Login successful')

      const role = (res.data.user?.role || '').toUpperCase()
      const email = (res.data.user?.email || formData.email || '').toLowerCase().trim()

      if (role === 'FY_ADMIN' || role === 'FIRST_YEAR_ADMIN' || email === 'admin2@mit.asia') {
        router.push('/admin/club-dashboard')
      } else if (role === 'SUPER_ADMIN' || role === 'ADMIN' || role === 'OE_ADMIN' || email === 'admin@mit.asia') {
        router.push('/admin/elective-dashboard')
      } else if (role === 'STUDENT') {
        router.push('/student/status')
      } else {
        router.push('/teacher/dashboard')
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Invalid credentials')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">Allocation Portal</h2>
        <p className="mt-2 text-center text-sm text-gray-600">Admin & Faculty Access</p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-sm border border-neutral-200 sm:rounded-lg sm:px-10">
          <form className="space-y-6" onSubmit={handleSubmit}>
            <Input label="Email" type="email" name="email" value={formData.email} onChange={handleChange} required />
            <Input label="Password" type="password" name="password" value={formData.password} onChange={handleChange} required />

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Logging in...' : 'Sign In'}
            </Button>
            
            <div className="mt-4 text-center">
              <Link href="/forgot-password/admin" className="text-sm text-teal-600 hover:text-teal-600">
                Forgot Password?
              </Link>
            </div>
          </form>
        </div>
        <p className="mt-6 text-center text-xs text-neutral-400">
          Designed &amp; Developed by{' '}
          <a href="https://webmitra.tech" target="_blank" rel="noopener noreferrer" className="text-teal-600 hover:text-teal-700 font-semibold transition-colors">WebMitra.tech Solutions</a>
        </p>
      </div>
    </div>
  )
}
