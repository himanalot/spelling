-- Create word frequencies table
CREATE TABLE IF NOT EXISTS word_frequencies (
    id BIGSERIAL PRIMARY KEY,
    word TEXT NOT NULL,
    frequency_category TEXT NOT NULL CHECK (frequency_category IN ('frequent', 'moderate', 'infrequent')),
    source_file TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
    UNIQUE(word)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_word_frequencies_word ON word_frequencies(word);
CREATE INDEX IF NOT EXISTS idx_word_frequencies_category ON word_frequencies(frequency_category);

-- Create a function to execute SQL for view creation (needed for the TypeScript code)
CREATE OR REPLACE FUNCTION exec_sql(sql text) RETURNS void AS $$
BEGIN
    EXECUTE sql;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 