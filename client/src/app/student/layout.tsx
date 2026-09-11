'use client'
import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuthContext } from '@/context/AuthContext'
import Navbar from '@/components/Navbar'
import Link from 'next/link'

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuthContext()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (!loading && (!user || user.role !== 'student')) {
      router.push('/')
    }
  }, [user, loading, router])

  if (loading || !user) return <div className="min-h-screen flex items-center justify-center">Loading...</div>

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col">
      <Navbar />
      <div className="bg-white border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex gap-4 sm:gap-8 overflow-x-auto">
            {user.year === 1 ? (
              <Link 
                href="/student/select-club" 
                className={`py-4 px-1 border-b-2 text-sm font-medium ${pathname === '/student/select-club' ? 'border-teal-600 text-teal-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
              >
                Select Clubs
              </Link>
            ) : (
              <Link 
                href="/student/select-elective" 
                className={`py-4 px-1 border-b-2 text-sm font-medium ${pathname === '/student/select-elective' ? 'border-teal-600 text-teal-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
              >
                Select Elective
              </Link>
            )}
            <Link 
              href="/student/status" 
              className={`py-4 px-1 border-b-2 text-sm font-medium ${pathname === '/student/status' ? 'border-teal-600 text-teal-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
            >
              My Status
            </Link>
            <Link 
              href="/student/profile" 
              className={`py-4 px-1 border-b-2 text-sm font-medium ${pathname === '/student/profile' ? 'border-teal-600 text-teal-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
            >
              My Profile
            </Link>
          </nav>
        </div>
      </div>
      <main className="flex-grow max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
      <footer className="border-t border-neutral-200 bg-white px-6 py-3 text-center text-xs text-neutral-400">
        Designed &amp; Developed by{' '}
        <a href="https://webmitra.tech" target="_blank" rel="noopener noreferrer" className="text-teal-600 hover:text-teal-700 font-semibold transition-colors">WebMitra.tech Solutions</a>
      </footer>
    </div>
  )
}
