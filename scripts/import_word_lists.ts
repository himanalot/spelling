import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs/promises'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
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
  throw new Error('Missing Supabase environment variables')
}

const supabase = createClient(supabaseUrl, supabaseKey)

type FrequencyCategory = 'frequent' | 'moderate' | 'infrequent'

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
  list_name: string
}

function shuffleArray<T>(array: T[]): T[] {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]]
  }
  return array
}

function createWordGroups(words: string[], category: FrequencyCategory): Map<string, string[]> {
  const shuffled = shuffleArray([...words])
  const groups = new Map<string, string[]>()
  const groupSize = 500

  for (let i = 0; i < shuffled.length; i += groupSize) {
    const groupNumber = Math.floor(i / groupSize) + 1
    const groupName = `cwl_${category.toLowerCase()}_list_${groupNumber}`
    groups.set(groupName, shuffled.slice(i, i + groupSize))
  }

  return groups
}

async function readWordList(filename: string): Promise<Set<string>> {
  try {
    const content = await fs.readFile(join(process.cwd(), filename), 'utf-8')
    return new Set(
      content.split('\n')
        .map(line => line.trim().toLowerCase())
        .filter(word => word.length > 0)
    )
  } catch (error) {
    console.error(`Error reading ${filename}:`, error)
    return new Set()
  }
}

async function findDictionaryFiles(): Promise<string[]> {
  const files = await fs.readdir(join(process.cwd(), 'src', 'app'))
  return files.filter(file => 
    file.includes('dictionary_data.json_') && 
    !file.includes('metadata')
  )
}

async function processDictionaryFiles(wordGroup: string[], listName: string): Promise<Map<string, DictionaryEntry>> {
  const dictionaryMap = new Map<string, DictionaryEntry>()
  const files = await findDictionaryFiles()
  const wordSet = new Set(wordGroup)
  
  // Group files by letter
  const filesByLetter = files.reduce((acc, file) => {
    const letter = file.charAt(0).toUpperCase()
    if (!acc[letter]) acc[letter] = []
    acc[letter].push(file)
    return acc
  }, {} as Record<string, string[]>)

  // Process each letter's files
  for (const [letter, letterFiles] of Object.entries(filesByLetter)) {
    console.log(`Processing files for letter ${letter}...`)

    try {
      // Load each type of data
      for (const file of letterFiles) {
        const filePath = join(process.cwd(), 'src', 'app', file)
        const content = await fs.readFile(filePath, 'utf-8')
        const data = JSON.parse(content)

        // Process each entry in the file
        for (const entry of data) {
          const word = entry.word.toLowerCase()
          // Only process words that are in our word group
          if (!wordSet.has(word)) continue

          if (!dictionaryMap.has(word)) {
            dictionaryMap.set(word, {
              word,
              letter,
              definitions: [],
              examples: [],
              pronunciations: [],
              metadata: null,
              list_name: listName
            })
          }

          const wordEntry = dictionaryMap.get(word)!

          if (file.includes('_definitions.json')) {
            const newDef = {
              definition_text: entry.definition_text,
              definition_number: entry.definition_number
            }
            if (!wordEntry.definitions.some(d => 
              d.definition_number === newDef.definition_number && 
              d.definition_text === newDef.definition_text
            )) {
              wordEntry.definitions.push(newDef)
            }
          }
          else if (file.includes('_examples.json')) {
            const newExample = {
              example_text: entry.example_text,
              example_number: entry.example_number,
              definition_number: entry.definition_number
            }
            if (!wordEntry.examples.some(e => 
              e.example_text === newExample.example_text
            )) {
              wordEntry.examples.push(newExample)
            }
          }
          else if (file.includes('_pronunciations.json')) {
            const newPron = {
              pronunciation_text: entry.pronunciation_text,
              audio_url: entry.audio_url,
              text_pronunciations: entry.text_pronunciations
            }
            if (!wordEntry.pronunciations.some(p => 
              p.pronunciation_text === newPron.pronunciation_text
            )) {
              wordEntry.pronunciations.push(newPron)
            }
          }
          else if (file.includes('_words.json')) {
            wordEntry.metadata = {
              part_of_speech: entry.part_of_speech,
              syllables: entry.syllables,
              etymology: entry.etymology
            }
          }
        }
      }
    } catch (error) {
      console.error(`Error processing files for letter ${letter}:`, error)
    }
  }

  return dictionaryMap
}

async function createTableForWordList(tableName: string): Promise<void> {
  const createTableSQL = `
    CREATE TABLE IF NOT EXISTS ${tableName} (
      id BIGSERIAL PRIMARY KEY,
      word TEXT NOT NULL,
      letter CHAR(1) NOT NULL,
      definitions JSONB NOT NULL DEFAULT '[]'::jsonb,
      examples JSONB NOT NULL DEFAULT '[]'::jsonb,
      pronunciations JSONB NOT NULL DEFAULT '[]'::jsonb,
      metadata JSONB,
      list_name TEXT NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
      UNIQUE(word)
    );

    CREATE INDEX IF NOT EXISTS idx_${tableName}_word ON ${tableName}(word);
    CREATE INDEX IF NOT EXISTS idx_${tableName}_letter ON ${tableName}(letter);
    CREATE INDEX IF NOT EXISTS idx_${tableName}_metadata ON ${tableName} USING gin (metadata);
    CREATE INDEX IF NOT EXISTS idx_${tableName}_definitions ON ${tableName} USING gin (definitions);
  `

  const { error } = await supabase.rpc('exec_sql', { sql: createTableSQL })
  if (error) {
    console.error(`Error creating table ${tableName}:`, error)
    throw error
  }
  console.log(`Created table ${tableName}`)
}

async function uploadWordListEntries(tableName: string, data: DictionaryEntry[]) {
  const BATCH_SIZE = 50
  console.log(`Uploading ${data.length} entries to ${tableName}...`)
  
  for (let i = 0; i < data.length; i += BATCH_SIZE) {
    const batch = data.slice(i, i + BATCH_SIZE)
    try {
      const { error } = await supabase
        .from(tableName)
        .upsert(batch, { onConflict: 'word' })
      
      if (error) throw error
      console.log(`Uploaded batch ${i / BATCH_SIZE + 1}/${Math.ceil(data.length / BATCH_SIZE)}`)
    } catch (error) {
      console.error(`Error uploading batch ${i / BATCH_SIZE + 1}:`, error)
      console.error('Error details:', error)
    }
  }
}

async function main() {
  // Read all word lists
  const lists = [
    { file: 'frequent_words_cwl.txt', category: 'frequent' as const },
    { file: 'moderate_words_cwl.txt', category: 'moderate' as const },
    { file: 'infrequent_words_cwl.txt', category: 'infrequent' as const }
  ]

  const missingWords = {
    frequent: new Set<string>(),
    moderate: new Set<string>(),
    infrequent: new Set<string>()
  }

  for (const list of lists) {
    const words = await readWordList(list.file)
    console.log(`Read ${words.size} words from ${list.file}`)

    // Create groups of 500 words
    const wordGroups = createWordGroups(Array.from(words), list.category)
    console.log(`Created ${wordGroups.size} groups of words for ${list.category}`)

    // Process each group
    for (const [groupName, groupWords] of wordGroups) {
      console.log(`\nProcessing group ${groupName} (${groupWords.length} words)...`)
      
      // Create table for this group
      await createTableForWordList(groupName)

      // Process dictionary files for these words
      const dictionaryMap = await processDictionaryFiles(groupWords, groupName)
      console.log(`Created ${dictionaryMap.size} entries with dictionary data`)

      // Track missing words
      const foundWords = new Set(dictionaryMap.keys())
      const missingInGroup = groupWords.filter(word => !foundWords.has(word))
      missingInGroup.forEach(word => missingWords[list.category].add(word))

      // Upload entries to the group's table
      await uploadWordListEntries(groupName, Array.from(dictionaryMap.values()))
    }
  }

  // Generate missing words report
  const reportContent = [
    'Missing Words Report\n',
    '===================\n\n',
    'Frequent Words:\n',
    `Total: ${missingWords.frequent.size}\n`,
    Array.from(missingWords.frequent).join('\n'),
    '\n\nModerate Words:\n',
    `Total: ${missingWords.moderate.size}\n`,
    Array.from(missingWords.moderate).join('\n'),
    '\n\nInfrequent Words:\n',
    `Total: ${missingWords.infrequent.size}\n`,
    Array.from(missingWords.infrequent).join('\n')
  ].join('')

  await fs.writeFile('missing_words_report.txt', reportContent, 'utf-8')
  console.log('\nMissing words report generated: missing_words_report.txt')
}

main().catch(console.error) 