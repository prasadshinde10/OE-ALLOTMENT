'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuthContext } from '@/context/AuthContext'

export default function Sidebar() {
  const pathname = usePathname()
  const { user } = useAuthContext()

  if (user?.role !== 'admin') return null;

  const links = [
    { href: '/admin/dashboard', label: 'Dashboard', icon: '📊' },
    { href: '/admin/electives', label: 'Electives', icon: '📚' },
    { href: '/admin/students', label: 'Students', icon: '🎓' },
    { href: '/admin/duplicates', label: 'Duplicates', icon: '👥' },
    { href: '/admin/audit-log', label: 'Audit Log', icon: '📋' },
    { href: '/admin/term-config', label: 'Term Config', icon: '⚙️' },
  ]

  return (
    <aside className="w-64 bg-gray-900 text-white flex-shrink-0 hidden md:flex flex-col h-[calc(100vh-68px)]">
      <div className="py-6 flex flex-col flex-grow">
        <nav className="flex flex-col gap-1 px-4">
          {links.map((link) => {
            const isActive = pathname === link.href
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive ? 'bg-indigo-600 text-white font-medium' : 'text-gray-300 hover:bg-gray-800 hover:text-white'}`}
              >
                <span className="text-lg">{link.icon}</span>
                {link.label}
              </Link>
            )
          })}
        </nav>
      </div>
    </aside>
  )
}
