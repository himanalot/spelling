'use client'

import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

interface WordList {
  word: string
  definitions: any[]
  examples: any[]
  pronunciations: any[]
}

interface ListInfo {
  name: string
  description: string
  table: string
}

interface TableInfo {
  table_name: string
}

type FrequencyType = 'frequent' | 'moderate' | 'infrequent'

export default function TestsPage() {
  const [lists, setLists] = useState<Record<string, WordList[]>>({})
  const [availableLists, setAvailableLists] = useState<ListInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [currentList, setCurrentList] = useState<string>('')
  const [currentWordIndex, setCurrentWordIndex] = useState(0)
  const [userInput, setUserInput] = useState('')
  const [showAnswer, setShowAnswer] = useState(false)
  const [score, setScore] = useState({ correct: 0, total: 0 })
  const supabase = createClientComponentClient()

  useEffect(() => {
    async function findAllWordLists() {
      try {
        // Query to find all tables that match our word list pattern
        const { data, error } = await supabase
          .rpc('get_word_list_tables');

        if (error) {
          console.error('Error fetching table names:', error);
          return [];
        }

        if (!data || !Array.isArray(data)) {
          console.error('Invalid data format returned from get_word_list_tables:', data);
          return [];
        }

        // Log the raw data for debugging
        console.log('Raw table data:', data);

        // Convert raw table names into ListInfo objects
        const lists = (data as TableInfo[])
          .filter(row => row && typeof row.table_name === 'string')
          .map((row) => {
            const parts = row.table_name.split('_');
            if (parts.length < 4) {
              console.warn(`Invalid table name format: ${row.table_name}`);
              return null;
            }
            const frequency = parts[1] as FrequencyType;
            const listNumber = parts[3];
            return {
              name: `${frequency.charAt(0).toUpperCase() + frequency.slice(1)} List ${listNumber}`,
              description: `${frequency.charAt(0).toUpperCase() + frequency.slice(1)} frequency words - List ${listNumber}`,
              table: row.table_name
            };
          })
          .filter((list): list is ListInfo => list !== null)
          .sort((a, b) => {
            const freqOrder: Record<FrequencyType, number> = {
              frequent: 1,
              moderate: 2,
              infrequent: 3
            };
            const aFreq = a.table.split('_')[1] as FrequencyType;
            const bFreq = b.table.split('_')[1] as FrequencyType;
            const aNum = parseInt(a.table.split('_')[3]);
            const bNum = parseInt(b.table.split('_')[3]);

            if (freqOrder[aFreq] === freqOrder[bFreq]) {
              return aNum - bNum;
            }
            return freqOrder[aFreq] - freqOrder[bFreq];
          });

        console.log('Processed lists:', lists);
        return lists;
      } catch (error) {
        console.error('Error in findAllWordLists:', error);
        return [];
      }
    }

    async function fetchWordList(listInfo: ListInfo) {
      try {
        // First check if the table exists
        const { data: tableExists, error: tableError } = await supabase
          .from(listInfo.table)
          .select('count')
          .limit(1);
        
        if (tableError) {
          console.error(`Table ${listInfo.table} error:`, tableError);
          return [];
        }

        // If table exists, fetch the words
        const { data, error } = await supabase
          .from(listInfo.table)
          .select('*')
          .not('pronunciations', 'eq', '[]')
          .not('pronunciations', 'is', null);

        if (error) {
          console.error(`Error fetching ${listInfo.name}:`, error.message);
          console.error('Full error:', error);
          return [];
        }

        if (!data) {
          console.warn(`No data returned for ${listInfo.name}`);
          return [];
        }

        return data;
      } catch (error) {
        if (error instanceof Error) {
          console.error(`Error fetching ${listInfo.name}:`, error.message);
        } else {
          console.error(`Unknown error fetching ${listInfo.name}:`, error);
        }
        return [];
      }
    }

    async function initialize() {
      try {
        const lists = await findAllWordLists();
        setAvailableLists(lists);

        const fetchedLists: Record<string, WordList[]> = {};
        for (const list of lists) {
          console.log(`Fetching list: ${list.name} from table: ${list.table}`);
          fetchedLists[list.table] = await fetchWordList(list);
          console.log(`Fetched ${fetchedLists[list.table].length} words from ${list.name}`);
        }
        setLists(fetchedLists);
      } catch (error) {
        console.error('Error in initialize:', error);
      } finally {
        setLoading(false);
      }
    }

    initialize()
  }, [supabase])

  const startTest = (listTable: string) => {
    setCurrentList(listTable)
    setCurrentWordIndex(0)
    setUserInput('')
    setShowAnswer(false)
    setScore({ correct: 0, total: 0 })
  }

  const checkAnswer = () => {
    const currentWord = lists[currentList][currentWordIndex]
    const isCorrect = userInput.toLowerCase().trim() === currentWord.word.toLowerCase()
    setScore(prev => ({
      correct: prev.correct + (isCorrect ? 1 : 0),
      total: prev.total + 1
    }))
    setShowAnswer(true)
  }

  const nextWord = () => {
    if (currentWordIndex < lists[currentList].length - 1) {
      setCurrentWordIndex(prev => prev + 1)
      setUserInput('')
      setShowAnswer(false)
    }
  }

  const renderQuiz = () => {
    if (!currentList || !lists[currentList]) return null

    const currentWord = lists[currentList][currentWordIndex]
    const progress = ((currentWordIndex + 1) / lists[currentList].length) * 100

    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Question {currentWordIndex + 1} of {lists[currentList].length}</CardTitle>
            <div className="text-sm">Score: {score.correct}/{score.total}</div>
          </div>
          <div className="w-full bg-secondary h-2 rounded-full mt-2">
            <div 
              className="bg-primary h-2 rounded-full transition-all duration-300" 
              style={{ width: `${progress}%` }}
            />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            {currentWord.definitions.map((def: any, idx: number) => (
              <p key={idx} className="text-lg">{def.definition_text}</p>
            ))}
            {currentWord.examples.length > 0 && (
              <p className="text-muted-foreground italic">
                Example: "{currentWord.examples[0].example_text.replace(new RegExp(currentWord.word, 'gi'), '_____')}"
              </p>
            )}
          </div>
          
          <div className="space-y-4">
            <div className="flex gap-2">
              <Input
                type="text"
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                placeholder="Type your answer..."
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !showAnswer) {
                    checkAnswer()
                  } else if (e.key === 'Enter' && showAnswer) {
                    nextWord()
                  }
                }}
                disabled={showAnswer}
              />
              <Button 
                onClick={showAnswer ? nextWord : checkAnswer}
                className="min-w-[100px]"
              >
                {showAnswer ? 'Next' : 'Check'}
              </Button>
            </div>
            
            {showAnswer && (
              <div className={cn(
                "p-4 rounded-lg",
                userInput.toLowerCase().trim() === currentWord.word.toLowerCase()
                  ? "bg-green-500/20 text-green-700 dark:text-green-300"
                  : "bg-red-500/20 text-red-700 dark:text-red-300"
              )}>
                <p className="font-medium">
                  {userInput.toLowerCase().trim() === currentWord.word.toLowerCase()
                    ? "Correct!"
                    : `Incorrect. The answer is: ${currentWord.word}`}
                </p>
                {currentWord.pronunciations?.length > 0 && (
                  <p className="text-sm mt-1">
                    Pronunciation: {currentWord.pronunciations[0].pronunciation_text}
                  </p>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>
  }

  if (currentList) {
    return (
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-3xl font-bold tracking-tight">Spelling Test</h2>
          <Button variant="outline" onClick={() => setCurrentList('')}>
            Exit Test
          </Button>
        </div>
        {renderQuiz()}
      </div>
    )
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Word Lists</h2>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {availableLists.map((list) => (
          <Card key={list.table} className="flex flex-col">
            <CardHeader>
              <CardTitle>{list.name}</CardTitle>
              <CardDescription>{list.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="mb-4 text-sm text-muted-foreground">
                {lists[list.table]?.length || 0} words available
              </p>
              <Button 
                onClick={() => startTest(list.table)}
                className="w-full"
              >
                Start Test
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
} 