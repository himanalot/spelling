export type WordFrequency = 'frequent' | 'moderate' | 'infrequent'

export interface Word {
  id: number
  word: string
  difficulty_level: number
  category: string
  frequency: WordFrequency
  created_at: string
}

export interface WordList {
  id: number
  name: string
  difficulty_level: number
  created_at: string
}

export interface WordListItem {
  id: number
  word_list_id: number
  word_id: number
  position: number
  created_at: string
  word?: Word // Included when joining with words table
}

export interface Database {
  public: {
    Tables: {
      words: {
        Row: Word
        Insert: Omit<Word, 'id' | 'created_at'>
        Update: Partial<Omit<Word, 'id' | 'created_at'>>
      }
      word_lists: {
        Row: WordList
        Insert: Omit<WordList, 'id' | 'created_at'>
        Update: Partial<Omit<WordList, 'id' | 'created_at'>>
      }
      word_list_items: {
        Row: WordListItem
        Insert: Omit<WordListItem, 'id' | 'created_at'>
        Update: Partial<Omit<WordListItem, 'id' | 'created_at'>>
      }
    }
  }
} 