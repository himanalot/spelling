'use client'

import * as React from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import Papa from 'papaparse'
import { toast } from 'sonner'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface DataTableProps {
  className?: string
}

export function DataTable({ className }: DataTableProps) {
  const [data, setData] = React.useState<string[][]>([])
  const [headers, setHeaders] = React.useState<string[]>([])
  const [searchTerm, setSearchTerm] = React.useState('')
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    Papa.parse(file, {
      complete: (results) => {
        if (results.data.length > 0) {
          const headers = results.data[0] as string[]
          const rows = results.data.slice(1) as string[][]
          
          // Filter out empty rows
          const filteredRows = rows.filter(row => row.some(cell => cell.trim() !== ''))
          
          setHeaders(headers)
          setData(filteredRows)
          toast.success('Researcher profiles loaded successfully!')
        }
      },
      error: (error) => {
        toast.error('Error parsing CSV file: ' + error.message)
      }
    })
  }

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault()
  }

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault()
    const file = event.dataTransfer.files?.[0]
    if (file && file.type === 'text/csv') {
      Papa.parse(file, {
        complete: (results) => {
          if (results.data.length > 0) {
            const headers = results.data[0] as string[]
            const rows = results.data.slice(1) as string[][]
            
            // Filter out empty rows
            const filteredRows = rows.filter(row => row.some(cell => cell.trim() !== ''))
            
            setHeaders(headers)
            setData(filteredRows)
            toast.success('Researcher profiles loaded successfully!')
          }
        },
        error: (error) => {
          toast.error('Error parsing CSV file: ' + error.message)
        }
      })
    } else {
      toast.error('Please drop a valid CSV file')
    }
  }

  const renderCell = (content: string, header: string) => {
    // Handle empty or dash-only content
    if (!content || content === '-') {
      return <span className="text-gray-400">Not available</span>
    }

    // Special handling for URLs
    if (header.toLowerCase().includes('url')) {
      return (
        <a 
          href={content}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:text-blue-800 hover:underline"
        >
          View Profile
        </a>
      )
    }

    // Special handling for PDF links
    if (header.toLowerCase().includes('pdf')) {
      const links = content.split(',').map(link => link.trim())
      return (
        <div className="space-y-1">
          {links.map((link, i) => (
            link && (
              <a 
                key={i}
                href={link}
                target="_blank"
                rel="noopener noreferrer"
                className="block text-blue-600 hover:text-blue-800 hover:underline"
              >
                Publication {i + 1}
              </a>
            )
          ))}
        </div>
      )
    }

    // Special handling for Yes/No/Unclear values
    if (['Yes', 'No', 'Unclear'].includes(content)) {
      const colors = {
        Yes: 'bg-green-100 text-green-800',
        No: 'bg-red-100 text-red-800',
        Unclear: 'bg-yellow-100 text-yellow-800'
      }
      return (
        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${colors[content as keyof typeof colors]}`}>
          {content}
        </span>
      )
    }

    // Render other content as Markdown
    return (
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({node, ...props}) => <p {...props} className="mb-2" />,
          a: ({node, ...props}) => (
            <a
              {...props}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 hover:underline"
            />
          ),
          ul: ({node, ...props}) => <ul {...props} className="list-disc pl-4 mb-2" />,
          ol: ({node, ...props}) => <ol {...props} className="list-decimal pl-4 mb-2" />,
          li: ({node, ...props}) => <li {...props} className="mb-1" />,
          code: ({node, ...props}) => (
            <code {...props} className="bg-gray-100 rounded px-1 py-0.5 text-sm font-mono" />
          )
        }}
      >
        {content}
      </ReactMarkdown>
    )
  }

  // Filter data based on search term
  const filteredData = React.useMemo(() => {
    if (!searchTerm) return data
    return data.filter(row => 
      row.some(cell => 
        cell.toLowerCase().includes(searchTerm.toLowerCase())
      )
    )
  }, [data, searchTerm])

  return (
    <div className={className}>
      <div className="mb-6 space-y-4">
        <div 
          className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-gray-400 transition-colors"
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            type="file"
            accept=".csv"
            className="hidden"
            ref={fileInputRef}
            onChange={handleFileUpload}
          />
          <p className="text-gray-500">
            Drag and drop a researcher profiles CSV file here, or click to select one
          </p>
          <p className="text-sm text-gray-400 mt-2">
            Supports markdown formatting and automatic link detection
          </p>
        </div>

        {data.length > 0 && (
          <div className="flex justify-between items-center">
            <Input
              type="search"
              placeholder="Search researchers..."
              className="max-w-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <p className="text-sm text-gray-500">
              Showing {filteredData.length} of {data.length} researchers
            </p>
          </div>
        )}
      </div>

      {filteredData.length > 0 ? (
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                {headers.map((header, index) => (
                  <TableHead key={index} className="whitespace-nowrap">
                    {header}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredData.map((row, rowIndex) => (
                <TableRow key={rowIndex}>
                  {row.map((cell, cellIndex) => (
                    <TableCell 
                      key={cellIndex} 
                      className="align-top"
                    >
                      {renderCell(cell, headers[cellIndex])}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="text-center py-4 text-gray-500">
          <p>No researcher profiles to display</p>
          <p className="text-sm mt-2">
            Upload a CSV file containing researcher profiles with the following columns:
          </p>
          <ul className="text-sm mt-1 space-y-1 text-gray-400">
            <li>Full Name</li>
            <li>Profile</li>
            <li>URL</li>
            <li>Published work or contributions</li>
            <li>Expertise indicators</li>
            <li>Publication PDFs</li>
            <li>Reasoning and evidence</li>
          </ul>
        </div>
      )}
    </div>
  )
} 