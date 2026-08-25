'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function AdminIndexPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/admin/dashboard')
  }, [router])

  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <p className="text-gray-500">Redirecting to Admin Dashboard...</p>
    </div>
  )
}
