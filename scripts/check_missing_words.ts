import * as fs from 'fs/promises'
import { join } from 'path'

interface MissingWordsReport {
  category: string
  total_words: number
  missing_words: string[]
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

async function getDictionaryWords(): Promise<Set<string>> {
  const dictionaryWords = new Set<string>()
  const files = await findDictionaryFiles()

  for (const file of files) {
    if (file.includes('_words.json')) {
      const filePath = join(process.cwd(), 'src', 'app', file)
      const content = await fs.readFile(filePath, 'utf-8')
      const data = JSON.parse(content)
      for (const entry of data) {
        dictionaryWords.add(entry.word.toLowerCase())
      }
    }
  }

  return dictionaryWords
}

async function checkMissingWords(): Promise<MissingWordsReport[]> {
  const lists = [
    { file: 'frequent_words_cwl.txt', category: 'frequent' },
    { file: 'moderate_words_cwl.txt', category: 'moderate' },
    { file: 'infrequent_words_cwl.txt', category: 'infrequent' }
  ]

  const dictionaryWords = await getDictionaryWords()
  const reports: MissingWordsReport[] = []

  for (const list of lists) {
    const words = await readWordList(list.file)
    const missingWords = Array.from(words).filter(word => !dictionaryWords.has(word))
    
    reports.push({
      category: list.category,
      total_words: words.size,
      missing_words: missingWords
    })
  }

  return reports
}

async function main() {
  const reports = await checkMissingWords()
  
  // Create report content
  let reportContent = 'Missing Words Report\n==================\n\n'
  
  for (const report of reports) {
    reportContent += `${report.category.toUpperCase()} Words\n`
    reportContent += `Total words in list: ${report.total_words}\n`
    reportContent += `Missing words: ${report.missing_words.length}\n`
    reportContent += 'Missing words list:\n'
    reportContent += report.missing_words.join('\n')
    reportContent += '\n\n'
  }

  // Write report to file
  await fs.writeFile('missing_words_report.txt', reportContent)
  console.log('Report generated: missing_words_report.txt')
}

main().catch(console.error) 