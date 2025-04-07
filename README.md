# Dictionary and Word Lists Project

A Next.js application for managing dictionary entries and word frequency lists, backed by Supabase.

## Features

- Dictionary data management with definitions, examples, and pronunciations
- Word frequency lists (frequent, moderate, infrequent)
- Supabase integration for data storage
- TypeScript support
- Parallel processing for data imports

## Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env.local` file with your Supabase credentials:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```
4. Run the development server:
   ```bash
   npm run dev
   ```

## Scripts

- `npm run import-dictionary` - Import dictionary data
- `npm run import-word-lists` - Import word frequency lists
- `npm run check-missing-words` - Generate report of missing words

## Database Schema

The project uses several tables in Supabase:

- `dictionary` - Main dictionary entries
- `cwl_*_list_*` - Word frequency list tables
- `word_frequencies` - Word frequency data

## Contributing

1. Create a feature branch
2. Make your changes
3. Submit a pull request

## License

MIT
