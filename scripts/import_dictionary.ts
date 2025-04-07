import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs/promises'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import * as dotenv from 'dotenv'
import { cpus } from 'os'
import { Worker, isMainThread, parentPort, workerData } from 'worker_threads'

// Get current file's directory
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Load environment variables from .env.local
dotenv.config({ path: join(process.cwd(), '.env.local') })

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables')
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false
  },
  db: {
    schema: 'public'
  }
})

interface WordPronunciation {
  pronunciation_text: string
  audio_url?: string
  text_pronunciations?: string[]
}

interface WordDefinition {
  definition_text: string
  definition_number: number
}

interface WordExample {
  example_text: string
  example_number: number
  definition_number: number
}

interface WordMetadata {
  part_of_speech: string | null
  syllables: string | null
  etymology: string | null
}

interface DictionaryEntry {
  word: string
  letter: string
  definitions: WordDefinition[]
  examples: WordExample[]
  pronunciations: WordPronunciation[]
  metadata: WordMetadata | null
}

interface WorkerResult {
  successCount: number
  errorCount: number
}

async function findDictionaryFiles(): Promise<string[]> {
  const files = await fs.readdir(join(process.cwd(), 'src', 'app'))
  return files.filter(file => 
    file.includes('dictionary_data.json_') && 
    !file.includes('metadata')
  )
}

async function processLetterFiles(letterFiles: string[], letter: string): Promise<Map<string, DictionaryEntry>> {
  const dictionaryMap = new Map<string, DictionaryEntry>()
  const fileContents = new Map<string, any[]>()

  try {
    // Read all files in parallel
    await Promise.all(letterFiles.map(async (file) => {
      const filePath = join(process.cwd(), 'src', 'app', file)
      const content = await fs.readFile(filePath, 'utf-8')
      fileContents.set(file, JSON.parse(content))
    }))

    // Process words first to create base entries
    const wordsFile = letterFiles.find(f => f.includes('_words.json'))
    if (wordsFile) {
      const wordsData = fileContents.get(wordsFile) || []
      for (const entry of wordsData) {
        dictionaryMap.set(entry.word, {
          word: entry.word,
          letter,
          definitions: [],
          examples: [],
          pronunciations: [],
          metadata: {
            part_of_speech: entry.part_of_speech,
            syllables: entry.syllables,
            etymology: entry.etymology
          }
        })
      }
    }

    // Process other files
    for (const [file, data] of fileContents.entries()) {
      if (file.includes('_definitions.json')) {
        for (const entry of data) {
          const wordEntry = dictionaryMap.get(entry.word)
          if (wordEntry) {
            wordEntry.definitions.push({
              definition_text: entry.definition_text,
              definition_number: entry.definition_number
            })
          }
        }
      }
      else if (file.includes('_examples.json')) {
        for (const entry of data) {
          const wordEntry = dictionaryMap.get(entry.word)
          if (wordEntry) {
            wordEntry.examples.push({
              example_text: entry.example_text,
              example_number: entry.example_number,
              definition_number: entry.definition_number
            })
          }
        }
      }
      else if (file.includes('_pronunciations.json')) {
        for (const entry of data) {
          const wordEntry = dictionaryMap.get(entry.word)
          if (wordEntry) {
            wordEntry.pronunciations.push({
              pronunciation_text: entry.pronunciation_text,
              audio_url: entry.audio_url,
              text_pronunciations: entry.text_pronunciations
            })
          }
        }
      }
    }
  } catch (error) {
    console.error(`Error processing files for letter ${letter}:`, error)
  }

  return dictionaryMap
}

async function uploadDictionaryBatch(entries: DictionaryEntry[]) {
  const BATCH_SIZE = 100 // Increased batch size
  let successCount = 0
  let errorCount = 0
  const totalBatches = Math.ceil(entries.length / BATCH_SIZE)

  for (let i = 0; i < entries.length; i += BATCH_SIZE) {
    const batch = entries.slice(i, i + BATCH_SIZE)
    const currentBatch = Math.floor(i / BATCH_SIZE) + 1
    
    try {
      const { error } = await supabase
        .from('dictionary')
        .insert(batch)
        .select()
      
      if (error) {
        console.error(`Batch ${currentBatch}/${totalBatches} error:`, error.message)
        errorCount += batch.length
      } else {
        successCount += batch.length
        console.log(`Batch ${currentBatch}/${totalBatches} complete (${batch.length} entries)`)
      }
    } catch (error) {
      console.error(`Batch ${currentBatch}/${totalBatches} error:`, error)
      errorCount += batch.length
    }
  }

  return { successCount, errorCount }
}

if (isMainThread) {
  // Main thread code
  async function main() {
    console.log('Finding and processing dictionary files...')
    const files = await findDictionaryFiles()
    
    // Group files by letter
    const filesByLetter = files.reduce((acc, file) => {
      const letter = file.charAt(0).toUpperCase()
      if (!acc[letter]) acc[letter] = []
      acc[letter].push(file)
      return acc
    }, {} as Record<string, string[]>)

    // Calculate chunks based on available CPUs (increased from 4 to 8)
    const numCPUs = Math.min(cpus().length, 8)
    const letters = Object.keys(filesByLetter)
    const chunkSize = Math.ceil(letters.length / numCPUs)
    const chunks = []

    for (let i = 0; i < letters.length; i += chunkSize) {
      const chunk = letters.slice(i, i + chunkSize)
      const chunkData = chunk.reduce((acc, letter) => {
        acc[letter] = filesByLetter[letter]
        return acc
      }, {} as Record<string, string[]>)
      chunks.push(chunkData)
    }

    console.log(`Processing in ${chunks.length} parallel chunks...`)

    // Create workers for each chunk
    const workers = chunks.map((chunk, index) => {
      return new Promise((resolve, reject) => {
        const worker = new Worker(__filename, {
          workerData: { chunk, chunkIndex: index }
        })

        worker.on('message', resolve)
        worker.on('error', reject)
        worker.on('exit', (code) => {
          if (code !== 0) {
            reject(new Error(`Worker stopped with exit code ${code}`))
          }
        })
      })
    })

    // Wait for all workers to complete
    const results = await Promise.all(workers) as WorkerResult[]
    const totalResults = results.reduce((acc: WorkerResult, result: WorkerResult) => {
      acc.successCount += result.successCount
      acc.errorCount += result.errorCount
      return acc
    }, { successCount: 0, errorCount: 0 } as WorkerResult)

    if (totalResults.successCount > 0) {
      console.log('\nCreating indexes...')
      await supabase.rpc('create_dictionary_indexes')
      console.log('Indexes created successfully')
    }

    console.log('\nImport completed:')
    console.log(`Successfully uploaded: ${totalResults.successCount} entries`)
    console.log(`Failed to upload: ${totalResults.errorCount} entries`)
  }

  main().catch(console.error)
} else {
  // Worker thread code
  async function workerProcess() {
    const { chunk, chunkIndex } = workerData
    const letters = Object.keys(chunk)
    let successCount = 0
    let errorCount = 0

    console.log(`Worker ${chunkIndex} processing letters: ${letters.join(', ')}`)

    for (const letter of letters) {
      const letterFiles = chunk[letter]
      const dictionaryMap = await processLetterFiles(letterFiles, letter)
      const entries = Array.from(dictionaryMap.values())
      
      console.log(`Worker ${chunkIndex} uploading letter ${letter}: ${entries.length} entries`)
      const result = await uploadDictionaryBatch(entries)
      successCount += result.successCount
      errorCount += result.errorCount

      console.log(`Worker ${chunkIndex} completed letter ${letter}: ${entries.length} entries`)
    }

    parentPort?.postMessage({ successCount, errorCount })
  }

  workerProcess().catch(error => {
    console.error('Worker error:', error)
    process.exit(1)
  })
} 