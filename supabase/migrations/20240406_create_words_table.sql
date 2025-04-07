-- Create words table for storing raw data
CREATE TABLE IF NOT EXISTS words (
    id BIGSERIAL PRIMARY KEY,
    word TEXT NOT NULL,
    source_file TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
    UNIQUE(word)
); 