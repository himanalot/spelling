'use client'

import { Card } from "@/components/ui/card"
import { Auth } from "@supabase/auth-ui-react"
import { ThemeSupa } from "@supabase/auth-ui-shared"
import { createClient } from "@/lib/supabase"

export default function Home() {
  const supabase = createClient()

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="w-full max-w-md">
        <Card className="p-8">
          <h1 className="text-2xl font-bold mb-6 text-center">Welcome to PIM2 Kinase Research Hub</h1>
          <Auth
            supabaseClient={supabase}
            appearance={{ theme: ThemeSupa }}
            providers={['google', 'github']}
            redirectTo={`${process.env.NEXT_PUBLIC_APP_URL}/dashboard`}
            theme="light"
          />
        </Card>
      </div>
    </main>
  )
}
