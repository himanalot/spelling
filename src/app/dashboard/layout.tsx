'use client'

import { ReactNode, Suspense } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/components/providers/AuthProvider'
import { useEffect } from 'react'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import Image from 'next/image'
import { cn } from '@/lib/utils'

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
      className={`px-4 py-2 rounded-full transition-all ${
        isActive
          ? 'bg-white/10 text-white font-medium backdrop-blur-sm'
          : 'text-gray-300 hover:text-white hover:bg-white/5'
      }`}
    >
      {children}
    </Link>
  )
}

export default function DashboardLayout({ children }: LayoutProps) {
  const { user, signOut } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (!user) {
      router.replace('/login')
    }
  }, [user, router])

  if (!user) {
    return null
  }

  const routes = [
    {
      href: '/dashboard',
      label: 'Overview',
      active: pathname === '/dashboard',
    },
    {
      href: '/dashboard/tests',
      label: 'Tests',
      active: pathname === '/dashboard/tests',
    },
    {
      href: '/dashboard/leaders',
      label: 'Leaders',
      active: pathname === '/dashboard/leaders',
    }
  ]

  return (
    <div className="relative min-h-screen bg-black text-white">
      {/* Background Image - you'll need to add your own elegant background image */}
      <div className="fixed inset-0 z-0 opacity-20">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/30 via-black to-black" />
      </div>

      {/* Content */}
      <div className="relative z-10">
        <header className="border-b border-white/10 backdrop-blur-md bg-black/30">
          <div className="container mx-auto px-6 py-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-6">
                <Link href="/dashboard" className="text-xl font-light tracking-wider">
                  OPUS
                </Link>
                <nav className="hidden md:flex space-x-2">
                  {routes.map((route) => (
                    <Link
                      key={route.href}
                      href={route.href}
                      className={cn(
                        'px-4 py-2 rounded-full transition-all',
                        route.active ? 'bg-white/10 text-white font-medium backdrop-blur-sm' : 'text-gray-300 hover:text-white hover:bg-white/5'
                      )}
                    >
                      {route.label}
                    </Link>
                  ))}
                </nav>
              </div>
              <div className="flex items-center space-x-4">
                <ThemeToggle />
                <button
                  onClick={() => {
                    signOut()
                    router.replace('/login')
                  }}
                  className="px-4 py-2 rounded-full text-sm font-light border border-white/20 hover:bg-white/10 transition-all"
                >
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        </header>

        <main className="min-h-[calc(100vh-4rem)] pb-24">
          <div className="container grid flex-1 gap-12 md:grid-cols-[200px_1fr]">
            <aside className="hidden w-[200px] flex-col md:flex">
              <nav className="grid items-start gap-2">
                {routes.map((route) => (
                  <Link
                    key={route.href}
                    href={route.href}
                    className={cn(
                      'flex items-center rounded-lg px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground',
                      route.active ? 'bg-accent' : 'transparent',
                    )}
                  >
                    {route.label}
                  </Link>
                ))}
              </nav>
            </aside>
            <main className="flex w-full flex-1 flex-col overflow-hidden">
              <Suspense fallback={<div>Loading...</div>}>
                {children}
              </Suspense>
            </main>
          </div>
        </main>

        {/* Bottom Bar */}
        <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 w-[1200px] max-w-[96%]">
          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-3xl h-14">
          </div>
        </div>
      </div>
    </div>
  )
} 