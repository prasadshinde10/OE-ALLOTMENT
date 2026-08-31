'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function RegisterRedirectPage() {
  const router = useRouter()

  useEffect(() => {
    // Automatically redirect to homepage where Microsoft SSO is available
    const timer = setTimeout(() => {
      router.replace('/')
    }, 3000)
    return () => clearTimeout(timer)
  }, [router])

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center bg-white p-8 rounded-2xl shadow-md border border-gray-100 space-y-4">
        <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mx-auto text-2xl">
          🔐
        </div>
        <h2 className="text-2xl font-bold text-gray-900">Official SSO Registration</h2>
        <p className="text-sm text-gray-600">
          Manual OTP registration has been updated. All student registrations and logins are now securely handled via official <strong>Microsoft Entra ID (@mit.asia)</strong>.
        </p>
        <div className="pt-2">
          <Link
            href="/"
            className="inline-flex items-center justify-center w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-medium transition-colors"
          >
            Go to Login Portal
          </Link>
        </div>
      </div>
    </div>
  )
}
