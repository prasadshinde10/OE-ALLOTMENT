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
      const isFYAdmin = role === 'FY_ADMIN' || role === 'FIRST_YEAR_ADMIN' || user.email === 'admin2@mit.asia'

      if (!isFYAdmin) {
        // If OE Admin accidentally navigates here, send them to their dashboard
        router.push('/admin/elective-dashboard')
      }
    }
  }, [user, loading, router])

  if (loading || !user) return <div className="min-h-screen flex items-center justify-center">Loading...</div>

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col">
      <Navbar onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
      <div className="flex flex-grow overflow-hidden">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <main className="flex-grow p-4 sm:p-6 overflow-auto">
          {children}
        </main>
        <footer className="border-t border-neutral-200 bg-white px-6 py-3 text-center text-xs text-neutral-400">
          Designed &amp; Developed by{' '}
          <a href="https://webmitra.tech" target="_blank" rel="noopener noreferrer" className="text-teal-600 hover:text-teal-700 font-semibold transition-colors">WebMitra.tech Solutions</a>
        </footer>
      </div>
    </div>
  )
}
