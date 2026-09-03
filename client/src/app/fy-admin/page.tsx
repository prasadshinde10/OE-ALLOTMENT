'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function FYAdminIndexPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/fy-admin/dashboard')
  }, [router])

  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <p className="text-gray-500">Redirecting to First-Year Admin Dashboard...</p>
    </div>
  )
}
