import { createClient } from '@/utils/supabase/client'

export interface User {
  id: string
  email: string | null
  name: string | null
}

export interface AuthCredentials {
  email: string
  password: string
}

class AuthService {
  private supabase = createClient()

  private getNameFromEmail(email: string | undefined | null): string | null {
    return email?.split('@')[0] || null
  }

  async login(credentials: AuthCredentials): Promise<User> {
    console.log("AuthService: Login attempt:", credentials.email)
    
    const { data, error } = await this.supabase.auth.signInWithPassword({
      email: credentials.email,
      password: credentials.password
    })
    
    if (error) {
      console.error("AuthService: Login failed:", error.message)
      throw new Error(error.message)
    }
    
    if (!data.user) {
      console.error("AuthService: Login failed: No user returned")
      throw new Error("Authentication failed")
    }
    
    console.log("AuthService: Login successful for user:", data.user.id)
    
    return {
      id: data.user.id,
      email: data.user.email || null,
      name: this.getNameFromEmail(data.user.email)
    }
  }
  
  async register(credentials: AuthCredentials & { name?: string }): Promise<User> {
    console.log("AuthService: Registration attempt:", credentials.email)
    
    const { data, error } = await this.supabase.auth.signUp({
      email: credentials.email,
      password: credentials.password,
      options: {
        data: {
          name: credentials.name || null,
        },
      }
    })
    
    if (error) {
      console.error("AuthService: Registration failed:", error.message)
      throw new Error(error.message)
    }
    
    if (!data.user) {
      console.error("AuthService: Registration failed: No user returned")
      throw new Error("Registration failed")
    }
    
    console.log("AuthService: Registration successful for user:", data.user.id)
    
    return {
      id: data.user.id,
      email: data.user.email || null,
      name: credentials.name || this.getNameFromEmail(data.user.email)
    }
  }
  
  async logout(): Promise<void> {
    console.log("AuthService: Logout attempt")
    const { error } = await this.supabase.auth.signOut()
    if (error) {
      console.error("AuthService: Logout failed:", error.message)
      throw new Error(error.message)
    }
    console.log("AuthService: Logout successful")
  }
  
  async getCurrentUser(): Promise<User | null> {
    console.log("AuthService: Getting current user")
    
    try {
      // First check if we have a session
      const { data: { session }, error: sessionError } = await this.supabase.auth.getSession()
      
      if (sessionError) {
        console.error("AuthService: Session check failed:", sessionError.message)
        return null
      }
      
      console.log("AuthService: Session check:", { 
        hasSession: !!session,
        sessionUser: session?.user?.id
      })
      
      if (!session?.user) {
        console.log("AuthService: No session user found")
        return null
      }

      // Use the session user directly instead of making another call
      const user = session.user
      console.log("AuthService: Found current user:", {
        id: user.id,
        email: user.email,
        metadata: user.user_metadata
      })
      
      return {
        id: user.id,
        email: user.email || null,
        name: (user.user_metadata?.name as string | null) || this.getNameFromEmail(user.email)
      }
    } catch (error) {
      console.error("AuthService: Error getting current user:", error)
      return null
    }
  }
  
  async getSession() {
    console.log("AuthService: Getting session")
    const { data: { session }, error } = await this.supabase.auth.getSession()
    
    if (error) {
      console.error("AuthService: Get session failed:", error.message)
      return null
    }
    
    console.log("AuthService: Session result:", { hasSession: !!session })
    return session
  }
}

export const authService = new AuthService() 