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
          className="text-lg sm:text-xl font-bold text-indigo-700 tracking-tight cursor-pointer"
          onClick={() => router.push('/')}
        >
          OE Allotment
        </div>
      </div>
      {user && (
        <div className="flex items-center gap-2 sm:gap-4">
          <div className="hidden sm:flex flex-col text-right">
            <span className="text-sm font-semibold text-gray-800">{user.name}</span>
            <span className="text-xs text-gray-500 uppercase tracking-wider">{user.role}</span>
          </div>
          <Button
            onClick={handleLogout}
            className="text-xs sm:text-sm px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 border-none"
          >
            Logout
          </Button>
        </div>
      )}
    </nav>
  )
}
