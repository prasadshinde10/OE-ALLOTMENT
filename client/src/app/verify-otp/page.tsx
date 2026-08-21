'use client'
import { useState, useRef, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import api from '@/lib/api'
import { useAuthContext } from '@/context/AuthContext'
import { Button } from '@/components/ui/Button'
import toast from 'react-hot-toast'

function VerifyOTPContent() {
  const searchParams = useSearchParams()
  const email = searchParams.get('email')
  const router = useRouter()
  const { login } = useAuthContext()
  
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [loading, setLoading] = useState(false)
  const [countdown, setCountdown] = useState(60)
  const [attempts, setAttempts] = useState(3)
  const inputsRef = useRef<(HTMLInputElement | null)[]>([])

  useEffect(() => {
    if (!email) {
      toast.error('Email missing. Please register again.')
      router.push('/register')
    }
  }, [email, router])

  useEffect(() => {
    const timer = countdown > 0 && setInterval(() => setCountdown(c => c - 1), 1000)
    return () => { if (timer) clearInterval(timer) }
  }, [countdown])

  const handleChange = (index: number, value: string) => {
    if (isNaN(Number(value))) return
    
    const newOtp = [...otp]
    newOtp[index] = value
    setOtp(newOtp)

    if (value !== '' && index < 5) {
      inputsRef.current[index + 1]?.focus()
    }
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && otp[index] === '' && index > 0) {
      inputsRef.current[index - 1]?.focus()
    }
  }

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    const otpValue = otp.join('')
    if (otpValue.length !== 6) {
      toast.error('Please enter complete OTP')
      return
    }

    try {
      setLoading(true)
      const res = await api.post('/api/auth/verify-otp', { email, otp: otpValue })
      login(res.data.token, res.data.user)
      toast.success('Verification successful!')
      router.push('/student/select-elective')
    } catch (err: any) {
      const remaining = attempts - 1
      setAttempts(remaining)
      toast.error(err.response?.data?.message || `Invalid OTP. ${remaining} attempts remaining.`)
      setOtp(['', '', '', '', '', ''])
      inputsRef.current[0]?.focus()
      if (remaining <= 0) {
        toast.error('Too many failed attempts. Please register again.')
        router.push('/register')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleResend = async () => {
    try {
      setLoading(true)
      await api.post('/api/auth/resend-otp', { email })
      toast.success('OTP resent successfully')
      setCountdown(60)
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to resend OTP')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">Verify OTP</h2>
        <p className="mt-2 text-center text-sm text-gray-600">Enter the 6-digit code sent to {email}</p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <form onSubmit={handleVerify} className="space-y-6">
            <div className="flex justify-between gap-2">
              {otp.map((digit, index) => (
                <input
                  key={index}
                  ref={el => { inputsRef.current[index] = el; }}
                  type="text"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  className="w-12 h-14 text-center text-2xl border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                  required
                />
              ))}
            </div>

            <Button type="submit" className="w-full" disabled={loading || otp.join('').length !== 6}>
              {loading ? 'Verifying...' : 'Verify OTP'}
            </Button>
            
            <div className="text-center mt-4">
              <button
                type="button"
                onClick={handleResend}
                disabled={countdown > 0 || loading}
                className="text-sm font-medium text-indigo-600 hover:text-indigo-500 disabled:text-gray-400"
              >
                {countdown > 0 ? `Resend OTP in ${countdown}s` : 'Resend OTP'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default function VerifyOTPPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <VerifyOTPContent />
    </Suspense>
  )
}
