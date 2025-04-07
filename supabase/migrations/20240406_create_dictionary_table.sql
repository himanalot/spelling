-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Drop existing table if it exists
DROP TABLE IF EXISTS dictionary;

-- Create dictionary table with all word information
CREATE UNLOGGED TABLE dictionary (
    id BIGSERIAL PRIMARY KEY,
    word TEXT NOT NULL,
    letter CHAR(1) NOT NULL,
    definitions JSONB NOT NULL DEFAULT '[]'::jsonb,  -- Array of {definition_text, definition_number}
    examples JSONB NOT NULL DEFAULT '[]'::jsonb,     -- Array of {example_text, example_number, definition_number}
    pronunciations JSONB NOT NULL DEFAULT '[]'::jsonb, -- Array of {pronunciation_text, audio_url, text_pronunciations}
    metadata JSONB,                                   -- {part_of_speech, syllables, etymology}
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Add unique constraint after data load for better insert performance
-- CREATE UNIQUE INDEX IF NOT EXISTS idx_dictionary_word_unique ON dictionary(word);

-- Indexes will be created after data load for better insert performance
-- CREATE INDEX IF NOT EXISTS idx_dictionary_letter ON dictionary(letter);
-- CREATE INDEX IF NOT EXISTS idx_dictionary_word_trgm ON dictionary USING gist (word gist_trgm_ops);
-- CREATE INDEX IF NOT EXISTS idx_dictionary_metadata ON dictionary USING gin (metadata);
-- CREATE INDEX IF NOT EXISTS idx_dictionary_definitions ON dictionary USING gin (definitions);

-- Create function to execute SQL for dynamic operations
CREATE OR REPLACE FUNCTION exec_sql(sql text) RETURNS void AS $$
BEGIN
    EXECUTE sql;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to add indexes after data load
CREATE OR REPLACE FUNCTION create_dictionary_indexes() RETURNS void AS $$
BEGIN
    CREATE UNIQUE INDEX IF NOT EXISTS idx_dictionary_word_unique ON dictionary(word);
    CREATE INDEX IF NOT EXISTS idx_dictionary_letter ON dictionary(letter);
    CREATE INDEX IF NOT EXISTS idx_dictionary_word_trgm ON dictionary USING gist (word gist_trgm_ops);
    CREATE INDEX IF NOT EXISTS idx_dictionary_metadata ON dictionary USING gin (metadata);
    CREATE INDEX IF NOT EXISTS idx_dictionary_definitions ON dictionary USING gin (definitions);
    ALTER TABLE dictionary SET LOGGED;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 