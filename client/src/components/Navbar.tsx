'use client'
import { useAuthContext } from '@/context/AuthContext'
import { Button } from '@/components/ui/Button'
import { useRouter } from 'next/navigation'

export default function Navbar() {
  const { user, logout } = useAuthContext()
  const router = useRouter()

  const handleLogout = () => {
    logout()
    router.push('/')
  }

  return (
    <nav className="bg-white shadow-sm border-b px-6 py-4 flex justify-between items-center sticky top-0 z-50">
      <div className="text-xl font-bold text-indigo-700 tracking-tight cursor-pointer" onClick={() => router.push('/')}>
        OE Allotment
      </div>
      {user && (
        <div className="flex items-center gap-4">
          <div className="flex flex-col text-right">
            <span className="text-sm font-semibold text-gray-800">{user.name}</span>
            <span className="text-xs text-gray-500 uppercase tracking-wider">{user.role}</span>
          </div>
          <Button onClick={handleLogout} className="text-sm px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 border-none">
            Logout
          </Button>
        </div>
      )}
    </nav>
  )
}
