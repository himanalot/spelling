-- Create words table
CREATE TABLE IF NOT EXISTS words (
    id BIGSERIAL PRIMARY KEY,
    word TEXT NOT NULL,
    source_file TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
    UNIQUE(word)
);

-- Create word lists table
CREATE TABLE IF NOT EXISTS word_lists (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    difficulty_level INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Create word list items table
CREATE TABLE IF NOT EXISTS word_list_items (
    id BIGSERIAL PRIMARY KEY,
    word_list_id BIGINT REFERENCES word_lists(id) ON DELETE CASCADE,
    word_id BIGINT REFERENCES words(id) ON DELETE CASCADE,
    position INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
    UNIQUE(word_list_id, word_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_words_difficulty ON words(difficulty_level);
CREATE INDEX IF NOT EXISTS idx_words_category ON words(category);
CREATE INDEX IF NOT EXISTS idx_words_frequency ON words(frequency);
CREATE INDEX IF NOT EXISTS idx_word_list_items_word_list ON word_list_items(word_list_id);
CREATE INDEX IF NOT EXISTS idx_words_source_file ON words(source_file);

-- Create types for word frequencies
DO $$ BEGIN
    CREATE TYPE word_frequency AS ENUM ('frequent', 'moderate', 'infrequent');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$; 