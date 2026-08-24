'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import api from '@/lib/api'
import { useAuthContext } from '@/context/AuthContext'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import toast from 'react-hot-toast'
import Link from 'next/link'

export default function StudentLoginPage() {
  const router = useRouter()
  const { login } = useAuthContext()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    instituteEmail: '',
    password: ''
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setLoading(true)
      const res = await api.post('/api/auth/student/login', formData)
      login(res.data.token, res.data.user)
      toast.success('Login successful')
      router.push('/student/status')
    } catch (err: any) {
      if (err.response?.data?.needsVerification) {
        toast.error('Please verify your email first')
        router.push(`/verify-otp?email=${encodeURIComponent(formData.instituteEmail)}`)
      } else if (err.response?.data?.message?.toLowerCase().includes('password')) {
        toast.error(err.response?.data?.message || 'Invalid password. Try reset password if not set.')
      } else {
        toast.error(err.response?.data?.message || 'Invalid credentials or student not found')
      }
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
            <Input 
              label="Institute Email" 
              type="email" 
              name="instituteEmail" 
              value={formData.instituteEmail} 
              onChange={handleChange} 
              required 
            />
            <Input 
              label="Password" 
              type="password" 
              name="password" 
              value={formData.password} 
              onChange={handleChange} 
              required 
            />

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Logging in...' : 'Sign In'}
            </Button>
            
            <div className="flex flex-col items-center gap-2 mt-4">
              <Link href="/forgot-password/student" className="text-sm text-indigo-600 hover:text-indigo-500">
                Forgot Password?
              </Link>
              <Link href="/register" className="text-sm text-indigo-600 hover:text-indigo-500">
                Don't have an account? Register here
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
