'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function AdminForgotPasswordPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/login/admin')
  }, [router])

  return null
}
