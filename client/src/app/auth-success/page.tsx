'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuthContext } from '@/context/AuthContext'
import { Suspense } from 'react'

function AuthSuccessContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { login } = useAuthContext()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const token = searchParams.get('token')
    const isNewUser = searchParams.get('isNewUser')

    if (!token) {
      setError('No authentication token received. Please try logging in again.')
      setTimeout(() => router.push('/'), 3000)
      return
    }

    // Store JWT token into localStorage and auth state
    login(token)

    // Check if new user or incomplete profile -> redirect to onboarding form
    if (isNewUser === 'true') {
      router.replace('/register/onboarding')
    } else {
      router.replace('/student/status')
    }
  }, [searchParams, login, router])

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white p-8 rounded-xl shadow-md border border-red-200 max-w-md text-center">
          <p className="text-red-600 font-medium">{error}</p>
          <p className="text-sm text-gray-500 mt-2">Redirecting to login...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white p-8 rounded-xl shadow-md border border-gray-200 max-w-md text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-4"></div>
        <p className="text-gray-700 font-medium">Signing you in with Microsoft...</p>
        <p className="text-sm text-gray-500 mt-1">Verifying your account details...</p>
      </div>
    </div>
  )
}

export default function AuthSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <p className="text-gray-500">Loading...</p>
        </div>
      }
    >
      <AuthSuccessContent />
    </Suspense>
  )
}
