'use client'

import { useAuth } from "@/components/providers/AuthProvider"
import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card } from "@/components/ui/card"
import { ArrowRight, Wallet, BarChart3, Settings } from "lucide-react"

export default function DashboardPage() {
  const { user } = useAuth()
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
    <div className="relative min-h-screen">
      {/* Main Content */}
      <div className="container mx-auto px-6 py-12">
        <div className="space-y-2 mb-12">
          <h1 className="text-4xl font-light tracking-tight text-white">
            Welcome back
          </h1>
          <p className="text-lg text-white/70">
            Your research assistant is ready
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Card className="p-6 bg-white/5 border-white/10 backdrop-blur-sm hover:bg-white/10 transition-all group cursor-pointer">
            <div className="flex items-center justify-between mb-4">
              <div className="h-12 w-12 rounded-full bg-blue-500/10 flex items-center justify-center">
                <BarChart3 className="h-6 w-6 text-blue-400" />
              </div>
              <ArrowRight className="h-5 w-5 text-white/30 group-hover:text-white/70 transition-colors" />
            </div>
            <h3 className="text-lg font-light text-white mb-1">Analytics</h3>
            <p className="text-sm text-white/50">View your research metrics</p>
          </Card>

          <Card className="p-6 bg-white/5 border-white/10 backdrop-blur-sm hover:bg-white/10 transition-all group cursor-pointer">
            <div className="flex items-center justify-between mb-4">
              <div className="h-12 w-12 rounded-full bg-emerald-500/10 flex items-center justify-center">
                <Wallet className="h-6 w-6 text-emerald-400" />
              </div>
              <ArrowRight className="h-5 w-5 text-white/30 group-hover:text-white/70 transition-colors" />
            </div>
            <h3 className="text-lg font-light text-white mb-1">Billing</h3>
            <p className="text-sm text-white/50">Manage your subscription</p>
          </Card>

          <Card className="p-6 bg-white/5 border-white/10 backdrop-blur-sm hover:bg-white/10 transition-all group cursor-pointer">
            <div className="flex items-center justify-between mb-4">
              <div className="h-12 w-12 rounded-full bg-purple-500/10 flex items-center justify-center">
                <Settings className="h-6 w-6 text-purple-400" />
              </div>
              <ArrowRight className="h-5 w-5 text-white/30 group-hover:text-white/70 transition-colors" />
            </div>
            <h3 className="text-lg font-light text-white mb-1">Settings</h3>
            <p className="text-sm text-white/50">Configure your workspace</p>
          </Card>
        </div>
      </div>

      
    </div>
  )
} 