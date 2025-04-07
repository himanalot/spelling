'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Github, Instagram, Linkedin } from 'lucide-react'

interface SocialLinks {
  linkedin?: string
  instagram?: string
  github?: string
}

interface Leader {
  name: string
  role: string
  image: string
  dimensions: { width: number, height: number }
  description: string
  links: SocialLinks
}

const leaders: Leader[] = [
  {
    name: 'Sam Evans',
    role: 'President',
    image: '/Sam.jpg',
    dimensions: { width: 88, height: 88 },
    description: 'President of Opus, leading the vision and strategy for revolutionizing language learning.',
    links: {
      linkedin: 'https://www.linkedin.com/in/samcevans'
    }
  },
  {
    name: 'Ishan Ramrakhiani',
    role: 'Founder',
    image: '/Ishan.jpeg',
    dimensions: { width: 300, height: 168 },
    description: 'Founder of Opus, driving innovation in educational technology and accessibility.',
    links: {
      instagram: 'https://www.instagram.com/ishanramrakhiani/',
      github: 'https://github.com/himanalot'
    }
  }
]

export default function LeadersPage() {
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({})

  const renderSocialLinks = (links: SocialLinks) => {
    return (
      <div className="flex mt-4 space-x-4">
        {links.linkedin && (
          <a
            href={links.linkedin}
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground hover:text-primary transition-colors"
            title="LinkedIn"
          >
            <Linkedin className="h-5 w-5" />
          </a>
        )}
        {links.instagram && (
          <a
            href={links.instagram}
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground hover:text-primary transition-colors"
            title="Instagram"
          >
            <Instagram className="h-5 w-5" />
          </a>
        )}
        {links.github && (
          <a
            href={links.github}
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground hover:text-primary transition-colors"
            title="GitHub"
          >
            <Github className="h-5 w-5" />
          </a>
        )}
      </div>
    )
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Leadership Team</h2>
      </div>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2 max-w-5xl mx-auto">
        {leaders
          .filter(leader => leader.name === 'Ishan Ramrakhiani')
          .map((leader) => (
          <Card key={leader.name} className="overflow-hidden">
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <CardTitle>{leader.name}</CardTitle>
                  <CardDescription className="text-base font-medium text-primary">
                    {leader.role}
                  </CardDescription>
                </div>
                <div className="relative w-18 h-18 rounded-full border-2 border-border overflow-hidden flex-shrink-0">
                  {!imageErrors[leader.name] ? (
                    <Image
                      src={leader.image}
                      alt={leader.name}
                      width={72}
                      height={72}
                      className="w-full h-full object-cover"
                      onError={() => {
                        console.error(`Failed to load image for ${leader.name}`)
                        setImageErrors(prev => ({ ...prev, [leader.name]: true }))
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-muted text-xl font-semibold">
                      {leader.name.split(' ').map(n => n[0]).join('')}
                    </div>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">{leader.description}</p>
              {renderSocialLinks(leader.links)}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
} 