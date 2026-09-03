'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthContext } from '@/context/AuthContext'
import Navbar from '@/components/Navbar'
import Sidebar from '@/components/Sidebar'

export default function FYAdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuthContext()
  const router = useRouter()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push('/login/admin')
        return
      }
      const role = (user.role || '').toUpperCase()
      const isAuthorized =
        role === 'FY_ADMIN' ||
        role === 'FIRST_YEAR_ADMIN' ||
        role === 'ADMIN' ||
        role === 'SUPER_ADMIN'

      if (!isAuthorized) {
        router.push('/login/admin')
      }
    }
  }, [user, loading, router])

  if (loading || !user) return <div className="min-h-screen flex items-center justify-center">Loading...</div>

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <Navbar onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
      <div className="flex flex-grow overflow-hidden">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <main className="flex-grow p-4 sm:p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
