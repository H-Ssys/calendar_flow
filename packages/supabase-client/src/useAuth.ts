import { useState, useEffect, useCallback } from 'react'
import type { User, Session } from '@supabase/supabase-js'
import { supabase } from './client'

export interface AuthState {
  user: User | null
  session: Session | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  signUp: (email: string, password: string, metadata?: Record<string, string>) => Promise<void>
}

export function useAuth(): AuthState {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get the initial session
    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      setSession(initialSession)
      setUser(initialSession?.user ?? null)
      setLoading(false)
    })

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        setSession(newSession)
        setUser(newSession?.user ?? null)
        setLoading(false)
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const signIn = useCallback(async (email: string, password: string): Promise<void> => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  }, [])

  const signOut = useCallback(async (): Promise<void> => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }, [])

  const signUp = useCallback(async (
    email: string,
    password: string,
    metadata?: Record<string, string>
  ): Promise<void> => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: metadata ? { data: metadata } : undefined,
    })
    if (error) throw error
  }, [])

  return { user, session, loading, signIn, signOut, signUp }
}
