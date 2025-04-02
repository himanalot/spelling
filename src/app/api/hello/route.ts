import { NextResponse } from 'next/server'

export interface HelloResponse {
  message: string
  timestamp: number
}

export async function GET() {
  const data: HelloResponse = {
    message: 'Hello from the API!',
    timestamp: Date.now(),
  }

  return NextResponse.json(data)
}

export async function POST(request: Request) {
  const body = await request.json()
  
  return NextResponse.json({
    message: 'Received your message!',
    yourData: body,
    timestamp: Date.now(),
  })
} 