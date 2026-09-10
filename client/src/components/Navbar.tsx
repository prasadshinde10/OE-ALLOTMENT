'use client'
import { useAuthContext } from '@/context/AuthContext'
import { Button } from '@/components/ui/Button'
import { useRouter } from 'next/navigation'
import Logo from '@/components/Logo'

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
    const role = (user.role || '').toUpperCase()
    if (role === 'ADMIN' || role === 'SUPER_ADMIN' || role === 'OE_ADMIN' || user.email === 'admin@mit.asia') {
      router.push('/admin/elective-dashboard')
    } else if (role === 'FY_ADMIN' || role === 'FIRST_YEAR_ADMIN' || user.email === 'admin2@mit.asia') {
      router.push('/admin/club-dashboard')
    } else if (role === 'TEACHER') {
      router.push('/teacher/dashboard')
    } else {
      router.push('/student/status')
    }
  }

  const userRole = (user?.role || '').toUpperCase()
  const isFYAdmin = userRole === 'FY_ADMIN' || userRole === 'FIRST_YEAR_ADMIN' || user?.email === 'admin2@mit.asia'
  const isOEAdmin = userRole === 'ADMIN' || userRole === 'SUPER_ADMIN' || userRole === 'OE_ADMIN' || user?.email === 'admin@mit.asia'

  const getRoleLabel = () => {
    if (isFYAdmin) return 'Club Admin'
    if (isOEAdmin) return 'OE Admin'
    if (userRole === 'TEACHER') return 'Faculty'
    return 'Student'
  }

  return (
    <nav className="bg-white shadow-sm border-b px-4 sm:px-6 py-3 flex justify-between items-center sticky top-0 z-30">
      <div className="flex items-center gap-3">
        {/* Mobile hamburger — for OE admin and Club admin */}
        {(isOEAdmin || isFYAdmin) && onToggleSidebar && (
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
          className="cursor-pointer select-none py-1"
          onClick={handleLogoClick}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') handleLogoClick()
          }}
        >
          <Logo variant="full" />
        </div>
      </div>
      {user && (
        <div className="flex items-center gap-2 sm:gap-4">
          <div className="hidden sm:flex flex-col text-right">
            <span className="text-sm font-semibold text-gray-800">{user.name}</span>
            <span className="text-xs font-semibold text-teal-600 uppercase tracking-wider">
              {getRoleLabel()}
            </span>
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
