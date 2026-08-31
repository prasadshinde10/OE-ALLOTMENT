'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function AdminAuditLogRedirect() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/admin/dashboard')
  }, [router])

  return (
    <div className="p-8 text-center text-gray-500">
      Redirecting to Dashboard...
    </div>
  )
}
