'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ProfileCard } from "@/components/ui/profile-card"
import Papa from "papaparse"
import { useCallback, useEffect, useState } from "react"
import { useDropzone } from "react-dropzone"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase"
import { useRouter } from "next/navigation"
import { Database } from "@/lib/database.types"
import { Button } from "@/components/ui/button"

type ResearcherProfile = Database['public']['Tables']['researcher_profiles']['Row']
type ResearcherProfileInsert = Database['public']['Tables']['researcher_profiles']['Insert']

interface CSVProfile {
  "Full Name": string
  "Profile": string
  "URL": string
  "Published work or contributions in the field of PIM2 kinase": string
  "Researcher with expertise in PIM2 kinase": string
  "Publication PDF": string
  "Reasoning for Published work or contributions in the field of PIM2 kinase": string
  "Reasoning for Researcher with expertise in PIM2 kinase": string
  "Email": string
}

interface CSVFile {
  name: string
  count: number
}

export default function ProfilesPage() {
  const [profiles, setProfiles] = useState<ResearcherProfile[]>([])
  const [csvFiles, setCsvFiles] = useState<CSVFile[]>([])
  const [selectedFile, setSelectedFile] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [isSigningOut, setIsSigningOut] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isUploading, setIsUploading] = useState(false)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    loadCsvFiles()
  }, [])

  useEffect(() => {
    loadProfiles()
  }, [selectedFile])

  const loadCsvFiles = async () => {
    try {
      const { data, error } = await supabase
        .from('researcher_profiles')
        .select('source_file')

      if (error) throw error

      // Get unique source files and their counts
      const fileMap = (data || []).reduce((acc, { source_file }) => {
        if (!source_file) return acc
        acc[source_file] = (acc[source_file] || 0) + 1
        return acc
      }, {} as Record<string, number>)

      const filesWithCounts = Object.entries(fileMap).map(([name, count]) => ({
        name,
        count
      }))

      setCsvFiles(filesWithCounts)
    } catch (error) {
      console.error('Error loading CSV files:', error)
      toast.error('Failed to load CSV files')
    }
  }

  const loadProfiles = async () => {
    try {
      if (!selectedFile) {
        setProfiles([])
        setIsLoading(false)
        return
      }

      const { data, error } = await supabase
        .from('researcher_profiles')
        .select('*')
        .eq('source_file', selectedFile)
        .order('created_at', { ascending: false })

      if (error) throw error

      setProfiles(data || [])
    } catch (error) {
      console.error('Error loading profiles:', error)
      toast.error('Failed to load profiles')
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
      toast.error('Failed to sign out. Please try again.')
      setIsSigningOut(false)
    }
  }

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    acceptedFiles.forEach((file) => {
      Papa.parse(file, {
        header: true,
        complete: async (results) => {
          try {
            setIsUploading(true)
            const csvProfiles = results.data as CSVProfile[]
            const validProfiles = csvProfiles.filter(
              profile => profile["Full Name"] && profile["Profile"]
            )

            const { data: { session } } = await supabase.auth.getSession()
            if (!session) throw new Error('No session')

            const dbProfiles = validProfiles.map(profile => ({
              user_id: session.user.id,
              full_name: profile["Full Name"],
              profile: profile["Profile"],
              url: profile["URL"] || null,
              published_work: profile["Published work or contributions in the field of PIM2 kinase"],
              expertise: profile["Researcher with expertise in PIM2 kinase"],
              publication_pdf: profile["Publication PDF"] || null,
              published_work_reasoning: profile["Reasoning for Published work or contributions in the field of PIM2 kinase"] || null,
              expertise_reasoning: profile["Reasoning for Researcher with expertise in PIM2 kinase"] || null,
              email: profile["Email"] || null,
              source_file: file.name
            }))

            const { error } = await supabase
              .from('researcher_profiles')
              .insert(dbProfiles)

            if (error) throw error

            toast.success("Success!", {
              description: `Uploaded ${dbProfiles.length} researcher profiles.`,
            })

            // Refresh CSV files list and select the new file
            await loadCsvFiles()
            setSelectedFile(file.name)
          } catch (error) {
            console.error('Error uploading profiles:', error)
            toast.error('Failed to upload profiles')
          } finally {
            setIsUploading(false)
          }
        },
        error: (error: Error) => {
          toast.error("Error", {
            description: "Failed to parse CSV file: " + error.message,
          })
          setIsUploading(false)
        },
      })
    })
  }, [supabase])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop })

  const filteredProfiles = profiles.filter((profile) => {
    const searchLower = searchTerm.toLowerCase()
    return (
      profile.full_name.toLowerCase().includes(searchLower) ||
      profile.profile.toLowerCase().includes(searchLower) ||
      profile.published_work.toLowerCase().includes(searchLower) ||
      (profile.email?.toLowerCase() || '').includes(searchLower)
    )
  })

  return (
    <main className="container mx-auto py-10 space-y-8">
      <div className="flex justify-between items-center">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold tracking-tight">PIM2 Kinase Researcher Profiles</h1>
          <p className="text-lg text-muted-foreground">
            Browse and search through profiles of researchers with expertise in PIM2 kinase.
          </p>
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

      <div className="grid gap-6 md:grid-cols-[300px_1fr]">
        <Card className="h-fit">
          <CardHeader>
            <CardTitle>CSV Files</CardTitle>
            <CardDescription>
              Select a CSV file to view its profiles or upload a new one.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors text-sm
                ${isDragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25"}
                ${isUploading ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              <input {...getInputProps()} disabled={isUploading} />
              {isUploading ? (
                <div className="flex flex-col items-center gap-2">
                  <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-800 rounded-full animate-spin"></div>
                  <p>Uploading...</p>
                </div>
              ) : isDragActive ? (
                <p>Drop the CSV file here...</p>
              ) : (
                <p>Drop a CSV file here, or click to select</p>
              )}
            </div>

            <div className="space-y-2">
              {csvFiles.map((file) => (
                <Button
                  key={file.name}
                  variant={selectedFile === file.name ? "default" : "outline"}
                  className="w-full justify-start"
                  onClick={() => setSelectedFile(file.name)}
                >
                  <div className="flex flex-col items-start">
                    <span className="font-medium truncate max-w-[250px]">{file.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {file.count} profiles
                    </span>
                  </div>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              {selectedFile ? (
                <span className="flex flex-col gap-1">
                  <span>{selectedFile}</span>
                  <span className="text-sm font-normal text-muted-foreground">
                    {profiles.length} researcher profiles
                  </span>
                </span>
              ) : (
                "Select a CSV file to view profiles"
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {selectedFile ? (
              <div>
                <div className="flex items-center gap-4 mb-4">
                  <input
                    type="search"
                    placeholder="Search researchers..."
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  <span className="text-sm text-muted-foreground whitespace-nowrap">
                    {filteredProfiles.length} results
                  </span>
                </div>

                {isLoading ? (
                  <div className="text-center py-8">
                    <div className="w-8 h-8 border-4 border-gray-300 border-t-gray-800 rounded-full animate-spin mx-auto"></div>
                    <p className="mt-2 text-sm text-gray-500">Loading profiles...</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {filteredProfiles.map((profile) => (
                      <ProfileCard
                        key={profile.id}
                        name={profile.full_name}
                        profile={profile.profile}
                        url={profile.url || ''}
                        publishedWork={profile.published_work}
                        expertise={profile.expertise}
                        publicationPdf={profile.publication_pdf || ''}
                        publishedWorkReasoning={profile.published_work_reasoning || ''}
                        expertiseReasoning={profile.expertise_reasoning || ''}
                        email={profile.email || ''}
                      />
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                Select a CSV file from the sidebar to view its profiles
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  )
} 