'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import api from '@/lib/api'
import { useAuthContext } from '@/context/AuthContext'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import toast from 'react-hot-toast'
import Link from 'next/link'

export default function Home() {
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
    <main className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-extrabold text-gray-900 mb-2">
            OE Allotment Platform
          </h1>
          <p className="text-sm text-gray-600">
            Student Login Portal
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-md p-8 border border-gray-100">
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
              {loading ? 'Logging in...' : 'Login'}
            </Button>
            
            <div className="flex flex-col items-center gap-2 mt-4">
              <Link href="/forgot-password/student" className="text-sm text-indigo-600 hover:text-indigo-500">
                Forgot Password?
              </Link>
              <Link href="/register" className="text-sm text-indigo-600 hover:text-indigo-500">
                Don&apos;t have an account? Register
              </Link>
            </div>
          </form>
        </div>

        <div className="mt-6 text-center">
          <Link href="/login/admin" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-indigo-600 transition-colors">
            🔒 Admin Login
          </Link>
        </div>
      </div>
    </main>
  )
}
