'use client'

import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

interface Pronunciation {
  audio_url: string | null
  pronunciation_text: string | null
  text_pronunciations: string[]
}

interface WordList {
  word: string
  definitions: any[]
  examples: any[]
  pronunciations: Pronunciation[]
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
  const [isPlaying, setIsPlaying] = useState(false)
  const [answers, setAnswers] = useState<Record<number, string>>({})
  const [answersShown, setAnswersShown] = useState<Record<number, boolean>>({})
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

        // If table exists, fetch the words with valid pronunciations
        const { data, error } = await supabase
          .from(listInfo.table)
          .select('*')
          .not('pronunciations', 'is', null)
          .not('pronunciations', 'eq', '[]')
          // Filter out words where all pronunciations are empty
          .not('pronunciations', 'cs', JSON.stringify([{
            audio_url: null,
            pronunciation_text: null,
            text_pronunciations: []
          }]));

        if (error) {
          console.error(`Error fetching ${listInfo.name}:`, error.message);
          console.error('Full error:', error);
          return [];
        }

        if (!data) {
          console.warn(`No data returned for ${listInfo.name}`);
          return [];
        }

        // Additional client-side filtering to ensure we only get words with valid pronunciations
        const filteredData = data.filter(word => {
          if (!Array.isArray(word.pronunciations)) return false;
          return word.pronunciations.some((p: Pronunciation) => 
            p.audio_url !== null || 
            p.pronunciation_text !== null || 
            (Array.isArray(p.text_pronunciations) && p.text_pronunciations.length > 0)
          );
        });

        console.log(`${listInfo.name}: Found ${data.length} words, filtered to ${filteredData.length} with valid pronunciations`);
        return filteredData;
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
    setAnswers({})
    setAnswersShown({})
  }

  const checkAnswer = () => {
    const currentWord = lists[currentList][currentWordIndex]
    const isCorrect = userInput.toLowerCase().trim() === currentWord.word.toLowerCase()
    setAnswers(prev => ({
      ...prev,
      [currentWordIndex]: userInput
    }))
    setAnswersShown(prev => ({
      ...prev,
      [currentWordIndex]: true
    }))
    setScore(prev => ({
      correct: prev.correct + (isCorrect ? 1 : 0),
      total: prev.total + 1
    }))
    setShowAnswer(true)
  }

  const nextWord = () => {
    if (currentWordIndex < lists[currentList].length - 1) {
      setCurrentWordIndex(prev => prev + 1)
      setUserInput(answers[currentWordIndex + 1] || '')
      setShowAnswer(answersShown[currentWordIndex + 1] || false)
    }
  }

  const previousWord = () => {
    if (currentWordIndex > 0) {
      setCurrentWordIndex(prev => prev - 1)
      setUserInput(answers[currentWordIndex - 1] || '')
      setShowAnswer(answersShown[currentWordIndex - 1] || false)
    }
  }

  const playPronunciations = async (pronunciations: any[]) => {
    if (isPlaying) return;
    setIsPlaying(true);

    const audioUrls = pronunciations
      .filter(p => p.audio_url)
      .map(p => p.audio_url);

    for (let i = 0; i < audioUrls.length; i++) {
      const audio = new Audio(audioUrls[i]);
      try {
        await audio.play();
        await new Promise(resolve => setTimeout(resolve, audio.duration * 1000 + 500)); // Wait for audio + 0.5s
      } catch (error) {
        console.error('Error playing audio:', error);
      }
    }

    setIsPlaying(false);
  };

  const jumpToBeginning = () => {
    setCurrentWordIndex(0)
    setUserInput(answers[0] || '')
    setShowAnswer(answersShown[0] || false)
  }

  const jumpToEnd = () => {
    const lastIndex = lists[currentList].length - 1
    setCurrentWordIndex(lastIndex)
    setUserInput(answers[lastIndex] || '')
    setShowAnswer(answersShown[lastIndex] || false)
  }

  const renderQuiz = () => {
    if (!currentList || !lists[currentList]) return null

    const currentWord = lists[currentList][currentWordIndex]
    const progress = ((currentWordIndex + 1) / lists[currentList].length) * 100
    const isFirstWord = currentWordIndex === 0
    const isLastWord = currentWordIndex === lists[currentList].length - 1

    return (
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-3xl font-bold tracking-tight">Spelling Test</h2>
          <Button variant="outline" onClick={() => setCurrentList('')}>
            Exit Test
          </Button>
        </div>
        <div className="flex flex-col h-[calc(100vh-12rem)] max-w-2xl mx-auto">
          <Card className="flex flex-col flex-1">
            <CardHeader className="border-b">
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
            <CardContent className="flex flex-col flex-1 p-0">
              {/* Scrollable content area */}
              <div className="flex-1 overflow-y-auto p-6">
                <div className="space-y-6">
                  {/* Definitions */}
                  <div className="space-y-2">
                    <h3 className="font-semibold text-lg">Definitions:</h3>
                    <div className="space-y-2 pl-4">
                      {currentWord.definitions.map((def: any, idx: number) => (
                        <p key={idx} className="text-base">{idx + 1}. {def.definition_text}</p>
                      ))}
                    </div>
                  </div>

                  {/* Examples */}
                  {currentWord.examples.length > 0 && (
                    <div className="space-y-2">
                      <h3 className="font-semibold text-lg">Examples:</h3>
                      <div className="space-y-2 pl-4">
                        {currentWord.examples.map((ex: any, idx: number) => (
                          <p key={idx} className="text-base italic">
                            {idx + 1}. "{ex.example_text.replace(new RegExp(currentWord.word, 'gi'), '_____')}"
                          </p>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Pronunciations */}
                  {currentWord.pronunciations?.length > 0 && (
                    <div className="space-y-2">
                      <h3 className="font-semibold text-lg">Pronunciation:</h3>
                      <div className="flex items-center gap-4 pl-4">
                        <Button 
                          onClick={() => playPronunciations(currentWord.pronunciations)}
                          disabled={isPlaying}
                          variant="outline"
                          className="flex items-center gap-2"
                        >
                          {isPlaying ? (
                            <>
                              <span className="i-lucide-loader-2 animate-spin" />
                              Playing...
                            </>
                          ) : (
                            <>
                              <span className="i-lucide-volume-2" />
                              Listen
                            </>
                          )}
                        </Button>
                        <div className="flex flex-wrap gap-2">
                          {currentWord.pronunciations.map((pron: any, idx: number) => (
                            pron.pronunciation_text && (
                              <span key={idx} className="text-base bg-muted px-2 py-1 rounded">
                                {pron.pronunciation_text}
                              </span>
                            )
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Fixed bottom section */}
              <div className="border-t p-6 space-y-4 bg-card">
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
                    disabled={showAnswer && isLastWord}
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
                  </div>
                )}

                <div className="flex justify-between items-center">
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={jumpToBeginning}
                      disabled={isFirstWord}
                      className="w-[100px]"
                      title="Jump to beginning"
                    >
                      <span className="i-lucide-chevrons-left" />
                    </Button>
                    <Button
                      variant="outline"
                      onClick={previousWord}
                      disabled={isFirstWord}
                      className="w-[100px]"
                    >
                      <span className="i-lucide-arrow-left mr-2" />
                      Previous
                    </Button>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {currentWordIndex + 1} / {lists[currentList].length}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={nextWord}
                      disabled={isLastWord && showAnswer}
                      className="w-[100px]"
                    >
                      Next
                      <span className="i-lucide-arrow-right ml-2" />
                    </Button>
                    <Button
                      variant="outline"
                      onClick={jumpToEnd}
                      disabled={isLastWord}
                      className="w-[100px]"
                      title="Jump to end"
                    >
                      <span className="i-lucide-chevrons-right" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>
  }

  if (currentList) {
    return renderQuiz()
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