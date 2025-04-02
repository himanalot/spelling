# PIM2 Kinase Research Hub

A web application for managing and exploring researcher profiles in the field of PIM2 kinase research. Built with Next.js, Supabase, and shadcn/ui.

## Features

- 🔐 Secure authentication with Google and GitHub
- 📊 Dashboard with research profile statistics
- 📁 CSV file upload and management
- 👥 Researcher profile viewing and searching
- 🎨 Modern UI with responsive design

## Tech Stack

- **Framework**: Next.js 14 with App Router
- **Authentication**: Supabase Auth
- **Database**: Supabase PostgreSQL
- **UI Components**: shadcn/ui
- **Styling**: Tailwind CSS
- **Language**: TypeScript

## Getting Started

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/pim2-research-hub.git
   cd pim2-research-hub
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env.local` file in the root directory with your Supabase credentials:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Database Setup

The application requires a Supabase project with the following table:

```sql
create table researcher_profiles (
  id uuid default uuid_generate_v4() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  full_name text,
  profile text,
  url text,
  published_work text,
  expertise text,
  publication_pdf text,
  published_work_reasoning text,
  expertise_reasoning text,
  email text,
  user_id uuid references auth.users(id),
  source_file text
);
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
