export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      researcher_profiles: {
        Row: {
          id: string
          created_at: string
          user_id: string
          full_name: string
          profile: string
          url: string | null
          published_work: string
          expertise: string
          publication_pdf: string | null
          published_work_reasoning: string | null
          expertise_reasoning: string | null
          email: string | null
          source_file: string
        }
        Insert: {
          id?: string
          created_at?: string
          user_id: string
          full_name: string
          profile: string
          url?: string | null
          published_work: string
          expertise: string
          publication_pdf?: string | null
          published_work_reasoning?: string | null
          expertise_reasoning?: string | null
          email?: string | null
          source_file: string
        }
        Update: {
          id?: string
          created_at?: string
          user_id?: string
          full_name?: string
          profile?: string
          url?: string | null
          published_work?: string
          expertise?: string
          publication_pdf?: string | null
          published_work_reasoning?: string | null
          expertise_reasoning?: string | null
          email?: string | null
          source_file?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
} 