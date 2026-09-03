'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuthContext } from '@/context/AuthContext'
import { useEffect } from 'react'

interface SidebarProps {
  isOpen?: boolean
  onClose?: () => void
}

export default function Sidebar({ isOpen = false, onClose }: SidebarProps) {
  const pathname = usePathname()
  const { user } = useAuthContext()

  // Close on Esc key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && onClose) onClose()
    }
    if (isOpen) {
      document.addEventListener('keydown', handleEsc)
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.removeEventListener('keydown', handleEsc)
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, onClose])

  const role = (user?.role || '').toUpperCase()
  const isFYAdmin = role === 'FY_ADMIN' || role === 'FIRST_YEAR_ADMIN'
  const isSuperAdmin = role === 'ADMIN' || role === 'SUPER_ADMIN'

  if (!isFYAdmin && !isSuperAdmin) return null

  const adminLinks = [
    { href: '/admin/dashboard', label: 'Dashboard' },
    { href: '/admin/electives', label: 'Electives' },
    { href: '/admin/departments', label: 'Departments' },
    { href: '/admin/students', label: 'Students' },
    { href: '/admin/branches', label: 'Branches' },
    { href: '/admin/duplicates', label: 'Duplicates' },
    { href: '/admin/term-config', label: 'Term Config' },
  ]

  const fyAdminLinks = [
    { href: '/fy-admin/dashboard', label: 'FY Dashboard' },
    { href: '/fy-admin/clubs', label: 'Club Management' },
    { href: '/fy-admin/students', label: 'FY Students' },
    { href: '/fy-admin/branches', label: 'FY Branches' },
    { href: '/fy-admin/term-config', label: 'FY Term Config' },
  ]

  const links = isFYAdmin ? fyAdminLinks : adminLinks

  const handleLinkClick = () => {
    if (onClose) onClose()
  }

  const navContent = (
    <nav className="flex flex-col gap-1 px-4 py-6">
      {links.map((link) => {
        const isActive = pathname === link.href
        return (
          <Link
            key={link.href}
            href={link.href}
            onClick={handleLinkClick}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-sm ${
              isActive
                ? 'bg-indigo-600 text-white font-medium'
                : 'text-gray-300 hover:bg-gray-800 hover:text-white'
            }`}
          >
            {link.label}
          </Link>
        )
      })}
    </nav>
  )

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="w-60 bg-gray-900 text-white flex-shrink-0 hidden md:flex flex-col h-[calc(100vh-57px)] sticky top-[57px]">
        {navContent}
      </aside>

      {/* Mobile drawer overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm md:hidden"
          onClick={onClose}
        />
      )}

      {/* Mobile drawer */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-gray-900 text-white transform transition-transform duration-300 ease-in-out md:hidden ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between px-4 py-4 border-b border-gray-800">
          <span className="text-lg font-bold text-white">OE Allotment</span>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-white rounded"
            aria-label="Close menu"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        {navContent}
      </aside>
    </>
  )
}
