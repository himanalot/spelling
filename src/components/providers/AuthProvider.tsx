'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { authService, type User } from '@/services/auth'
import { createClient } from '@/utils/supabase/client'

interface AuthContextType {
  user: User | null
  isAuthenticated: boolean
  error: Error | null
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, name?: string) => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    const supabase = createClient()

    // Set up auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_OUT' || !session) {
          setUser(null)
          return
        }

        if (session?.user) {
          const user = {
            id: session.user.id,
            email: session.user.email || null,
            name: (session.user.user_metadata?.name as string | null) || 
                  session.user.email?.split('@')[0] || null
          }
          setUser(user)
        }
      }
    )

    // Check initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser({
          id: session.user.id,
          email: session.user.email || null,
          name: (session.user.user_metadata?.name as string | null) || 
                session.user.email?.split('@')[0] || null
        })
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const signIn = async (email: string, password: string) => {
    try {
      setError(null)
      const user = await authService.login({ email, password })
      setUser(user)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Login failed'))
      throw err
    }
  }

  const signUp = async (email: string, password: string, name?: string) => {
    try {
      setError(null)
      const user = await authService.register({ email, password, name })
      setUser(user)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Registration failed'))
      throw err
    }
  }

  const signOut = async () => {
    try {
      setError(null)
      await authService.logout()
      setUser(null)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Logout failed'))
      throw err
    }
  }

  const value = {
    user,
    isAuthenticated: !!user,
    error,
    signIn,
    signUp,
    signOut
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
} 