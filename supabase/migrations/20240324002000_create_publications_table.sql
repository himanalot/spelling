-- Create publications table
CREATE TABLE IF NOT EXISTS publications (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    url TEXT NOT NULL,
    analysis TEXT,
    processed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    researcher_profile_id uuid REFERENCES researcher_profiles(id),
    embedding vector(1536)  -- For semantic search
);

-- Create index for vector similarity search
CREATE INDEX IF NOT EXISTS publications_embedding_idx ON publications
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100); 