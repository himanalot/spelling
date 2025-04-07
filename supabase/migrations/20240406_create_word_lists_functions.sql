-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Create a function to execute dynamic SQL (needed for creating tables dynamically)
CREATE OR REPLACE FUNCTION exec_sql(sql text) RETURNS void AS $$
BEGIN
    EXECUTE sql;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to get all word list tables
CREATE OR REPLACE FUNCTION get_word_list_tables()
RETURNS TABLE (table_name text) AS $$
BEGIN
    RETURN QUERY
    SELECT tablename::text
    FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename LIKE 'cwl_%_list_%';
END;
$$ LANGUAGE plpgsql;

-- Create a function to get words from a specific list
CREATE OR REPLACE FUNCTION get_word_list(list_name text)
RETURNS TABLE (
    word text,
    letter char(1),
    definitions jsonb,
    examples jsonb,
    pronunciations jsonb,
    metadata jsonb
) AS $$
BEGIN
    RETURN QUERY EXECUTE format(
        'SELECT word, letter, definitions, examples, pronunciations, metadata 
         FROM %I 
         ORDER BY word',
        list_name
    );
END;
$$ LANGUAGE plpgsql;

-- Create a function to search across all word lists
CREATE OR REPLACE FUNCTION search_word_lists(search_term text)
RETURNS TABLE (
    table_name text,
    word text,
    letter char(1),
    definitions jsonb,
    examples jsonb,
    pronunciations jsonb,
    metadata jsonb
) AS $$
DECLARE
    table_record record;
BEGIN
    FOR table_record IN 
        SELECT * FROM get_word_list_tables()
    LOOP
        RETURN QUERY EXECUTE format(
            'SELECT %L::text, word, letter, definitions, examples, pronunciations, metadata 
             FROM %I 
             WHERE word ILIKE %L',
            table_record.table_name,
            table_record.table_name,
            '%' || search_term || '%'
        );
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Create a function to get random words from a specific list
CREATE OR REPLACE FUNCTION get_random_words(list_name text, num_words integer)
RETURNS TABLE (
    word text,
    letter char(1),
    definitions jsonb,
    examples jsonb,
    pronunciations jsonb,
    metadata jsonb
) AS $$
BEGIN
    RETURN QUERY EXECUTE format(
        'SELECT word, letter, definitions, examples, pronunciations, metadata 
         FROM %I 
         ORDER BY random() 
         LIMIT %s',
        list_name,
        num_words
    );
END;
$$ LANGUAGE plpgsql;

-- Create a function to get words by letter from a specific list
CREATE OR REPLACE FUNCTION get_words_by_letter(list_name text, letter_param char(1))
RETURNS TABLE (
    word text,
    letter char(1),
    definitions jsonb,
    examples jsonb,
    pronunciations jsonb,
    metadata jsonb
) AS $$
BEGIN
    RETURN QUERY EXECUTE format(
        'SELECT word, letter, definitions, examples, pronunciations, metadata 
         FROM %I 
         WHERE letter = %L
         ORDER BY word',
        list_name,
        letter_param
    );
END;
$$ LANGUAGE plpgsql;

-- Create a function to count words in each list
CREATE OR REPLACE FUNCTION count_words_in_lists()
RETURNS TABLE (
    list_name text,
    word_count bigint
) AS $$
DECLARE
    table_record record;
BEGIN
    FOR table_record IN 
        SELECT * FROM get_word_list_tables()
    LOOP
        RETURN QUERY EXECUTE format(
            'SELECT %L::text, COUNT(*)::bigint FROM %I',
            table_record.table_name,
            table_record.table_name
        );
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Create a function to get word details across all lists
CREATE OR REPLACE FUNCTION get_word_details(search_word text)
RETURNS TABLE (
    list_name text,
    word text,
    letter char(1),
    definitions jsonb,
    examples jsonb,
    pronunciations jsonb,
    metadata jsonb
) AS $$
DECLARE
    table_record record;
BEGIN
    FOR table_record IN 
        SELECT * FROM get_word_list_tables()
    LOOP
        RETURN QUERY EXECUTE format(
            'SELECT %L::text, word, letter, definitions, examples, pronunciations, metadata 
             FROM %I 
             WHERE word = %L',
            table_record.table_name,
            table_record.table_name,
            search_word
        );
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Create a function to get words with specific metadata
CREATE OR REPLACE FUNCTION get_words_by_metadata(list_name text, metadata_key text, metadata_value text)
RETURNS TABLE (
    word text,
    letter char(1),
    definitions jsonb,
    examples jsonb,
    pronunciations jsonb,
    metadata jsonb
) AS $$
BEGIN
    RETURN QUERY EXECUTE format(
        'SELECT word, letter, definitions, examples, pronunciations, metadata 
         FROM %I 
         WHERE metadata->>%L = %L
         ORDER BY word',
        list_name,
        metadata_key,
        metadata_value
    );
END;
$$ LANGUAGE plpgsql;

-- Create a view to show list statistics
CREATE OR REPLACE VIEW word_list_statistics AS
SELECT 
    list_name,
    word_count,
    (
        SELECT COUNT(DISTINCT letter)::integer 
        FROM get_word_list(list_name)
    ) as unique_letters,
    (
        SELECT AVG(jsonb_array_length(definitions))::numeric(10,2)
        FROM get_word_list(list_name)
    ) as avg_definitions_per_word,
    (
        SELECT AVG(jsonb_array_length(examples))::numeric(10,2)
        FROM get_word_list(list_name)
    ) as avg_examples_per_word
FROM count_words_in_lists(); 