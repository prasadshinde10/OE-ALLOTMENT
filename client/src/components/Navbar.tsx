'use client'
import { useAuthContext } from '@/context/AuthContext'
import { Button } from '@/components/ui/Button'
import { useRouter } from 'next/navigation'

interface NavbarProps {
  onToggleSidebar?: () => void
}

export default function Navbar({ onToggleSidebar }: NavbarProps) {
  const { user, logout } = useAuthContext()
  const router = useRouter()

  const handleLogout = () => {
    logout()
    router.push('/')
  }

  const handleLogoClick = () => {
    if (!user) {
      router.push('/')
      return
    }
    if (user.role === 'admin') {
      router.push('/admin/dashboard')
    } else if (user.role === 'teacher') {
      router.push('/teacher/dashboard')
    } else {
      router.push('/student/status')
    }
  }

  return (
    <nav className="bg-white shadow-sm border-b px-4 sm:px-6 py-3 flex justify-between items-center sticky top-0 z-30">
      <div className="flex items-center gap-3">
        {/* Mobile hamburger — only for admin */}
        {user?.role === 'admin' && onToggleSidebar && (
          <button
            onClick={onToggleSidebar}
            className="md:hidden p-1.5 -ml-1 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
            aria-label="Open menu"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 12h18M3 6h18M3 18h18" />
            </svg>
          </button>
        )}
        <div
          className="flex items-center gap-2 cursor-pointer select-none group"
          onClick={handleLogoClick}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') handleLogoClick()
          }}
        >
          <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow-sm group-hover:bg-indigo-700 transition-colors">
            OE
          </div>
          <span className="text-lg sm:text-xl font-bold text-indigo-700 tracking-tight group-hover:text-indigo-800 transition-colors">
            OE Allotment
          </span>
        </div>
      </div>
      {user && (
        <div className="flex items-center gap-2 sm:gap-4">
          <div className="hidden sm:flex flex-col text-right">
            <span className="text-sm font-semibold text-gray-800">{user.name}</span>
            <span className="text-xs text-gray-500 uppercase tracking-wider">{user.role}</span>
          </div>
          <Button
            variant="danger"
            size="sm"
            onClick={handleLogout}
            className="text-xs sm:text-sm px-3.5 py-1.5 font-medium rounded-lg shadow-sm"
          >
            Logout
          </Button>
        </div>
      )}
    </nav>
  )
}
