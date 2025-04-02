create table "public"."researcher_profiles" (
    "id" uuid not null default gen_random_uuid(),
    "created_at" timestamp with time zone not null default now(),
    "user_id" uuid not null references auth.users on delete cascade,
    "full_name" text not null,
    "profile" text not null,
    "url" text,
    "published_work" text not null,
    "expertise" text not null,
    "publication_pdf" text,
    "published_work_reasoning" text,
    "expertise_reasoning" text,
    "email" text,
    primary key ("id")
);

-- Create indexes for common search fields
create index researcher_profiles_full_name_idx on public.researcher_profiles using gin (to_tsvector('english', full_name));
create index researcher_profiles_profile_idx on public.researcher_profiles using gin (to_tsvector('english', profile));
create index researcher_profiles_published_work_idx on public.researcher_profiles using gin (to_tsvector('english', published_work));
create index researcher_profiles_email_idx on public.researcher_profiles (email);
create index researcher_profiles_user_id_idx on public.researcher_profiles (user_id);

-- Set up Row Level Security (RLS)
alter table "public"."researcher_profiles" enable row level security;

-- Create policies
create policy "Users can view all researcher profiles"
    on public.researcher_profiles for select
    using (true);

create policy "Users can insert their own researcher profiles"
    on public.researcher_profiles for insert
    with check (auth.uid() = user_id);

create policy "Users can update their own researcher profiles"
    on public.researcher_profiles for update
    using (auth.uid() = user_id);

create policy "Users can delete their own researcher profiles"
    on public.researcher_profiles for delete
    using (auth.uid() = user_id); 