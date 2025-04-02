'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase"
import Link from "next/link"

export default function DashboardPage() {
  const [stats, setStats] = useState({
    totalProfiles: 0,
    totalFiles: 0
  })
  const [isLoading, setIsLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    loadStats()
  }, [])

  const loadStats = async () => {
    try {
      // Get total profiles
      const { count: totalProfiles, error: profilesError } = await supabase
        .from('researcher_profiles')
        .select('*', { count: 'exact', head: true })

      if (profilesError) throw profilesError

      // Get unique files
      const { data: files, error: filesError } = await supabase
        .from('researcher_profiles')
        .select('source_file')

      if (filesError) throw filesError

      const uniqueFiles = new Set(files?.map(f => f.source_file) || [])

      setStats({
        totalProfiles: totalProfiles || 0,
        totalFiles: uniqueFiles.size
      })
    } catch (error) {
      console.error('Error loading stats:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-lg text-muted-foreground">
          Welcome to your PIM2 Kinase Research Hub dashboard.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Link href="/dashboard/profiles">
          <Card className="hover:bg-gray-50 transition-colors cursor-pointer">
            <CardHeader>
              <CardTitle>Researcher Profiles</CardTitle>
              <CardDescription>
                View and manage researcher profiles from your CSV files.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="h-16 flex items-center justify-center">
                  <div className="w-6 h-6 border-2 border-gray-300 border-t-gray-800 rounded-full animate-spin"></div>
                </div>
              ) : (
                <div className="space-y-1">
                  <p className="text-2xl font-bold">{stats.totalProfiles}</p>
                  <p className="text-sm text-muted-foreground">Total profiles</p>
                  <p className="text-sm text-muted-foreground">
                    From {stats.totalFiles} CSV file{stats.totalFiles === 1 ? '' : 's'}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </Link>

        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>
              Common tasks and actions.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Link
              href="/dashboard/profiles"
              className="block p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
            >
              <div className="font-medium">Upload New CSV</div>
              <div className="text-sm text-muted-foreground">
                Import researcher profiles from a CSV file
              </div>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 