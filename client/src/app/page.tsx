'use client'

import { useState, useEffect } from 'react'
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
  const [showPasswordLogin, setShowPasswordLogin] = useState(false)
  const [formData, setFormData] = useState({
    instituteEmail: '',
    password: ''
  })

  // Show SSO error if redirected back with ?error=...
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      const error = params.get('error')
      if (error) {
        toast.error(decodeURIComponent(error))
        // Clean URL
        window.history.replaceState({}, '', '/')
      }
    }
  }, [])

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
        toast.error('Account not verified. Please sign in using your official Microsoft SSO account.')
      } else if (err.response?.data?.message?.toLowerCase().includes('password')) {
        toast.error(err.response?.data?.message || 'Invalid password. Try reset password or sign in with Microsoft.')
      } else {
        toast.error(err.response?.data?.message || 'Invalid credentials or student not found')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleMicrosoftLogin = () => {
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'
    window.location.href = `${backendUrl}/api/auth/microsoft`
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-50 to-gray-100 p-4">
      <div className="max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-600 rounded-2xl shadow-lg shadow-indigo-200 text-white font-bold text-2xl mb-4">
            OE
          </div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
            Open Elective Portal
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Student Allotment & Registration System
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl shadow-gray-200/50 p-8 border border-gray-100 space-y-6">
          {/* Primary CTA: 1-Click Microsoft SSO */}
          <div className="space-y-3">
            <button
              type="button"
              onClick={handleMicrosoftLogin}
              className="w-full flex items-center justify-center gap-3 px-5 py-3.5 bg-slate-900 hover:bg-black text-white rounded-xl shadow-md hover:shadow-lg transition-all transform active:scale-[0.99] font-medium text-sm"
            >
              <svg className="w-5 h-5 shrink-0" viewBox="0 0 21 21" fill="none">
                <rect x="1" y="1" width="9" height="9" fill="#f25022" />
                <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
                <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
                <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
              </svg>
              <span>Continue with Microsoft (@mit.asia)</span>
            </button>
            <p className="text-xs text-center text-gray-400">
              Instant 1-click Sign In & Registration for all MIT students
            </p>
          </div>

          {/* Toggle for manual password login */}
          <div className="pt-2">
            <div className="relative flex items-center justify-center">
              <div className="border-t border-gray-200 w-full" />
              <button
                type="button"
                onClick={() => setShowPasswordLogin(!showPasswordLogin)}
                className="absolute bg-white px-3 text-xs text-gray-400 hover:text-gray-600 transition-colors uppercase tracking-wider font-medium"
              >
                {showPasswordLogin ? 'Hide password login' : 'Or sign in with password'}
              </button>
            </div>
          </div>

          {/* Password Login Form (Expandable) */}
          {showPasswordLogin && (
            <form className="space-y-4 pt-2 animate-fadeIn" onSubmit={handleSubmit}>
              <Input
                label="Institute Email"
                type="email"
                name="instituteEmail"
                placeholder="you@mit.asia"
                value={formData.instituteEmail}
                onChange={handleChange}
                required
              />
              <Input
                label="Password"
                type="password"
                name="password"
                placeholder="••••••••"
                value={formData.password}
                onChange={handleChange}
                required
              />

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Signing in...' : 'Sign In with Password'}
              </Button>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <Link
            href="/login/admin"
            className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-indigo-600 transition-colors font-medium"
          >
            Administrator / Faculty Access
          </Link>
        </div>
      </div>
    </main>
  )
}
