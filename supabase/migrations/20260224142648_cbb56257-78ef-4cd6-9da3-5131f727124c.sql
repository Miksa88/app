-- Create profiles table
create table if not exists public.profiles (
  id uuid references auth.users not null primary key,
  first_name text,
  last_name text,
  email text,
  role text default 'client',
  date_of_birth date,
  current_weight numeric,
  height numeric,
  goal text,
  injuries text,
  allergies text,
  food_dislikes text,
  job_type text,
  work_schedule text,
  level integer default 1,
  avatar_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.profiles enable row level security;

-- Policies
create policy "Public profiles are viewable by everyone"
  on profiles for select
  using ( true );

create policy "Users can insert their own profile"
  on profiles for insert
  with check ( auth.uid() = id );

create policy "Users can update own profile"
  on profiles for update
  using ( auth.uid() = id );

-- Handle new user trigger
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, first_name, last_name, role)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'first_name',
    new.raw_user_meta_data->>'last_name',
    coalesce(new.raw_user_meta_data->>'role', 'client')
  );
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Storage for progress photos
insert into storage.buckets (id, name, public) 
values ('progress-photos', 'progress-photos', false)
on conflict (id) do nothing;

-- Storage policies
create policy "Users can upload their own progress photos"
  on storage.objects for insert
  with check ( bucket_id = 'progress-photos' and auth.uid() = owner );

create policy "Users can view their own progress photos"
  on storage.objects for select
  using ( bucket_id = 'progress-photos' and auth.uid() = owner );

create policy "Trainers can view all progress photos"
  on storage.objects for select
  using (
    bucket_id = 'progress-photos'
    AND
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'trainer'
    )
  );