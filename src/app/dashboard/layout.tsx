'use client'

import { ReactNode } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/components/providers/AuthProvider'
import { useEffect } from 'react'

interface LayoutProps {
  children: ReactNode;
}

// NavLink component for active state tracking
const NavLink = ({ href, children }: { href: string; children: ReactNode }) => {
  const pathname = usePathname()
  const isActive = pathname === href
  
  return (
    <Link
      href={href}
      className={`px-4 py-2 rounded-md transition-colors ${
        isActive
          ? 'bg-gray-100 text-gray-900 font-medium'
          : 'text-gray-700 hover:bg-gray-100'
      }`}
    >
      {children}
    </Link>
  )
}

export default function DashboardLayout({ children }: LayoutProps) {
  const { user, signOut } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!user) {
      router.replace('/login')
    }
  }, [user, router])

  if (!user) {
    return null
  }

  return (
    <div className="flex flex-col min-h-screen">
      <header className="bg-white border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <Link href="/dashboard" className="text-lg font-bold">
                Dashboard
              </Link>
              <nav className="hidden md:flex space-x-2">
                <NavLink href="/dashboard">Overview</NavLink>
                <NavLink href="/dashboard/documents">Documents</NavLink>
                <NavLink href="/dashboard/profiles">Profiles</NavLink>
              </nav>
            </div>
            <div className="flex items-center">
              <button
                onClick={() => {
                  signOut()
                  router.replace('/login')
                }}
                className="px-4 py-2 rounded-md bg-red-500 text-white hover:bg-red-600 transition-colors"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>
      <main className="flex-grow bg-gray-50">
        {children}
      </main>
    </div>
  )
} 