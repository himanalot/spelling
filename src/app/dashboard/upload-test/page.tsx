'use client'

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useCallback, useState } from "react"
import { useDropzone } from "react-dropzone"
import { toast } from "sonner"

export default function UploadTestPage() {
  const [isUploading, setIsUploading] = useState(false)
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([])

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    setIsUploading(true)
    try {
      for (const file of acceptedFiles) {
        const formData = new FormData()
        formData.append('file', file)
        
        const response = await fetch('/api/sciphi/upload', {
          method: 'POST',
          body: formData,
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || `Upload failed: ${response.statusText}`)
        }

        setUploadedFiles(prev => [...prev, file.name])
        toast.success(data.message || `Successfully uploaded ${file.name}`)
      }
    } catch (error) {
      console.error('Upload error:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to upload file', {
        description: error instanceof Error ? error.stack : undefined,
        duration: 5000
      })
    } finally {
      setIsUploading(false)
    }
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'text/plain': ['.txt'],
    },
    maxSize: 10 * 1024 * 1024 // 10MB max file size
  })

  return (
    <div className="container mx-auto py-10">
      <Card>
        <CardHeader>
          <CardTitle>SciPhi Document Upload Test</CardTitle>
          <CardDescription>
            Upload PDF or text files to test SciPhi integration. Maximum file size: 10MB.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-10 text-center cursor-pointer transition-colors
              ${isDragActive ? 'border-primary bg-primary/5' : 'border-gray-300'}
              ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <input {...getInputProps()} />
            {isUploading ? (
              <div className="flex items-center justify-center">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                <span className="ml-2">Uploading...</span>
              </div>
            ) : isDragActive ? (
              <p>Drop the files here...</p>
            ) : (
              <div>
                <p>Drag and drop files here, or click to select files</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Supports PDF and TXT files up to 10MB
                </p>
              </div>
            )}
          </div>

          {uploadedFiles.length > 0 && (
            <div className="mt-6">
              <h3 className="font-medium mb-2">Uploaded Files:</h3>
              <ul className="space-y-1">
                {uploadedFiles.map((fileName, index) => (
                  <li key={index} className="text-sm text-muted-foreground">
                    ✓ {fileName}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
} 