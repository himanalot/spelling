'use client'

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { ExternalLink, FileText, Mail } from "lucide-react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

interface ProfileCardProps {
  name: string
  profile: string
  url: string
  publishedWork: string
  expertise: string
  publicationPdf: string
  publishedWorkReasoning: string
  expertiseReasoning: string
  email?: string
}

export function ProfileCard({
  name,
  profile,
  url,
  publishedWork,
  expertise,
  publicationPdf,
  publishedWorkReasoning,
  expertiseReasoning,
  email,
}: ProfileCardProps) {
  const renderStatus = (value: string) => {
    const status = value?.toLowerCase()
    if (status === "yes") {
      return <Badge className="bg-green-500">Yes</Badge>
    } else if (status === "no") {
      return <Badge variant="destructive">No</Badge>
    } else if (status === "unclear") {
      return <Badge variant="secondary">Unclear</Badge>
    }
    return null
  }

  const isValidUrl = (urlString: string) => {
    try {
      const url = new URL(urlString.trim())
      return url.protocol === "http:" || url.protocol === "https:"
    } catch {
      return false
    }
  }

  const extractPublicationInfo = (text: string, pdfUrls: string) => {
    // First try to find Markdown links
    const markdownLinkRegex = /\[([^\]]+)\]\(([^)]+)\)/g
    const matches = Array.from(text.matchAll(markdownLinkRegex))
    
    if (matches.length > 0) {
      return matches.map(match => ({
        title: match[1],
        url: match[2]
      }))
    }

    // If no Markdown links, try to extract URLs from the publicationPdf field
    if (pdfUrls) {
      const urls = pdfUrls.split(',').map(url => url.trim())
      return urls.map((url, index) => {
        // Try to extract a meaningful name from the URL
        let title = url
        try {
          const urlObj = new URL(url)
          const path = urlObj.pathname
          // Extract filename without extension
          const filename = path.split('/').pop()?.split('.')[0] || ''
          // Convert dashes and underscores to spaces and capitalize
          title = filename
            .replace(/[-_]/g, ' ')
            .replace(/([a-z])([A-Z])/g, '$1 $2') // Add space between camelCase
            .split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(' ')
        } catch {
          title = `Publication ${index + 1}`
        }
        return {
          title,
          url
        }
      })
    }

    // Fallback to looking for quoted titles
    const titleMatch = text?.match(/titled "([^"]+)"/) || 
                      text?.match(/paper "([^"]+)"/) ||
                      text?.match(/publication "([^"]+)"/)
    
    if (titleMatch) {
      return [{
        title: titleMatch[1],
        url: publicationPdf
      }]
    }

    return []
  }

  const renderLinks = () => {
    const links = []
    
    // Profile link
    if (url && isValidUrl(url)) {
      links.push(
        <TooltipProvider key="profile">
          <Tooltip>
            <TooltipTrigger asChild>
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800"
              >
                <ExternalLink className="h-4 w-4" />
                View Profile
              </a>
            </TooltipTrigger>
            <TooltipContent>
              <p>View {name}'s full profile</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )
    }

    // Email link
    if (email) {
      links.push(
        <TooltipProvider key="email">
          <Tooltip>
            <TooltipTrigger asChild>
              <a
                href={`mailto:${email}`}
                className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800"
              >
                <Mail className="h-4 w-4" />
                Email
              </a>
            </TooltipTrigger>
            <TooltipContent>
              <p>{email}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )
    }

    // Publication links
    const publications = extractPublicationInfo(publishedWorkReasoning || '', publicationPdf)
    publications.forEach((pub, index) => {
      if (pub.url && isValidUrl(pub.url)) {
        links.push(
          <TooltipProvider key={`pub-${index}`}>
            <Tooltip>
              <TooltipTrigger asChild>
                <a
                  href={pub.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800"
                >
                  <FileText className="h-4 w-4" />
                  Publication {publications.length > 1 ? index + 1 : ''}
                </a>
              </TooltipTrigger>
              <TooltipContent>
                <p className="max-w-xs text-sm">
                  {pub.title || `Publication ${index + 1}`}
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )
      }
    })

    return links
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <CardTitle className="line-clamp-2">{name}</CardTitle>
        <CardDescription>
          <div className="line-clamp-3 prose prose-sm dark:prose-invert max-w-none">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{profile}</ReactMarkdown>
          </div>
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1 space-y-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Published Work:</span>
            {renderStatus(publishedWork)}
          </div>
          {publishedWorkReasoning && (
            <div className="text-sm text-muted-foreground prose prose-sm dark:prose-invert max-w-none">
              <div className="line-clamp-3">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{publishedWorkReasoning}</ReactMarkdown>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">PIM2 Kinase Expert:</span>
            {renderStatus(expertise)}
          </div>
          {expertiseReasoning && (
            <div className="text-sm text-muted-foreground prose prose-sm dark:prose-invert max-w-none">
              <div className="line-clamp-3">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{expertiseReasoning}</ReactMarkdown>
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-4 pt-4 mt-auto">
          {renderLinks()}
        </div>
      </CardContent>
    </Card>
  )
} 