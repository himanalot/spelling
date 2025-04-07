-- Create word lists table with full dictionary data
CREATE TABLE IF NOT EXISTS word_lists (
    id BIGSERIAL PRIMARY KEY,
    word TEXT NOT NULL,
    letter CHAR(1) NOT NULL,
    definitions JSONB NOT NULL DEFAULT '[]'::jsonb,  -- Array of {definition_text, definition_number}
    examples JSONB NOT NULL DEFAULT '[]'::jsonb,     -- Array of {example_text, example_number, definition_number}
    pronunciations JSONB NOT NULL DEFAULT '[]'::jsonb, -- Array of {pronunciation_text, audio_url, text_pronunciations}
    metadata JSONB,                                   -- {part_of_speech, syllables, etymology}
    frequency_category TEXT NOT NULL CHECK (frequency_category IN ('frequent', 'moderate', 'infrequent')),
    source_file TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
    UNIQUE(word)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_word_lists_word ON word_lists(word);
CREATE INDEX IF NOT EXISTS idx_word_lists_letter ON word_lists(letter);
CREATE INDEX IF NOT EXISTS idx_word_lists_category ON word_lists(frequency_category);
CREATE INDEX IF NOT EXISTS idx_word_lists_metadata ON word_lists USING gin (metadata);
CREATE INDEX IF NOT EXISTS idx_word_lists_definitions ON word_lists USING gin (definitions); 