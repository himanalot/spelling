'use client'

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import Link from "next/link"
import { cn } from "@/lib/utils"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [isLoading, setIsLoading] = useState(true)
  const [isSigningOut, setIsSigningOut] = useState(false)
  const supabase = createClientComponentClient()
  const router = useRouter()

  useEffect(() => {
    checkAuth()
  }, [router, supabase.auth])

  const checkAuth = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.replace('/')
        return
      }
    } catch (error) {
      console.error('Error checking auth:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSignOut = async () => {
    try {
      setIsSigningOut(true)
      await supabase.auth.signOut()
      router.replace('/')
    } catch (error) {
      console.error('Sign out error:', error)
      setIsSigningOut(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="w-8 h-8 border-4 border-gray-300 border-t-gray-800 rounded-full animate-spin"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white shadow">
        <div className="container mx-auto px-4">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center">
              <Link href="/dashboard" className="text-xl font-bold text-gray-800">
                PIM2 Research Hub
              </Link>
              <div className="ml-10 flex items-baseline space-x-4">
                <NavLink href="/dashboard">Overview</NavLink>
                <NavLink href="/dashboard/profiles">Researcher Profiles</NavLink>
                <NavLink href="/dashboard/documents">Documents</NavLink>
              </div>
            </div>
            <button
              onClick={handleSignOut}
              disabled={isSigningOut}
              className={`px-4 py-2 rounded-lg transition-colors ${
                isSigningOut 
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-gray-800 hover:bg-gray-700 text-white'
              }`}
            >
              {isSigningOut ? (
                <span className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-gray-200 border-t-white rounded-full animate-spin"></div>
                  Signing out...
                </span>
              ) : (
                'Sign Out'
              )}
            </button>
          </div>
        </div>
      </nav>

      {/* Main content */}
      <main className="container mx-auto py-6 px-4">
        {children}
      </main>
    </div>
  )
}

function NavLink({ href, children }: { href: string, children: React.ReactNode }) {
  const isActive = typeof window !== 'undefined' && window.location.pathname === href

  return (
    <Link
      href={href}
      className={cn(
        "px-3 py-2 rounded-md text-sm font-medium transition-colors",
        isActive
          ? "bg-gray-800 text-white"
          : "text-gray-600 hover:bg-gray-700 hover:text-white"
      )}
    >
      {children}
    </Link>
  )
} 