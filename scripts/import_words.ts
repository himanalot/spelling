import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs/promises'
import { fileURLToPath } from 'url'
import { dirname, basename, join } from 'path'
import * as dotenv from 'dotenv'

// Get current file's directory
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Load environment variables from .env.local
dotenv.config({ path: join(process.cwd(), '.env.local') })

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables. Please check your .env.local file.')
}

const supabase = createClient(supabaseUrl, supabaseKey)

interface WordEntry {
  word: string
  source_file: string
}

async function processTextFile(filePath: string): Promise<WordEntry[]> {
  const content = await fs.readFile(filePath, 'utf-8')
  const words = content.split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .map(word => ({
      word,
      source_file: basename(filePath)
    }))
  
  return words
}

async function processJsonFile(filePath: string): Promise<WordEntry[]> {
  const content = await fs.readFile(filePath, 'utf-8')
  const jsonData = JSON.parse(content)
  
  // If it's an array, use it directly, otherwise wrap in array
  const dataArray = Array.isArray(jsonData) ? jsonData : [jsonData]
  
  return dataArray.map(item => ({
    word: JSON.stringify(item),
    source_file: basename(filePath)
  }))
}

async function uploadWords(words: WordEntry[]) {
  const BATCH_SIZE = 100
  console.log(`Uploading ${words.length} words from ${words[0]?.source_file || 'unknown source'}...`)
  
  for (let i = 0; i < words.length; i += BATCH_SIZE) {
    const batch = words.slice(i, i + BATCH_SIZE)
    try {
      const { error } = await supabase
        .from('words')
        .upsert(batch, { onConflict: 'word' })
      
      if (error) throw error
      console.log(`Uploaded batch ${i / BATCH_SIZE + 1}/${Math.ceil(words.length / BATCH_SIZE)}`)
    } catch (error) {
      console.error(`Error uploading batch ${i / BATCH_SIZE + 1}:`, error)
    }
  }
}

async function main() {
  // Get all text and JSON files in the directory
  const files = await fs.readdir(process.cwd())
  const textFiles = files.filter(file => file.endsWith('.txt'))
  const jsonFiles = files.filter(file => file.endsWith('.json'))
  
  // Process text files
  for (const file of textFiles) {
    console.log(`Processing text file ${file}...`)
    const words = await processTextFile(file)
    await uploadWords(words)
  }
  
  // Process JSON files
  for (const file of jsonFiles) {
    console.log(`Processing JSON file ${file}...`)
    const words = await processJsonFile(file)
    if (words.length > 0) {
      await uploadWords(words)
    } else {
      console.log(`No data found in ${file}`)
    }
  }
}

main().catch(console.error) 