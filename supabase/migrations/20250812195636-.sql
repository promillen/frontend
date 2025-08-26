-- Create device_access for per-device authorization if it doesn't exist
create table if not exists public.device_access (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  devid text not null,
  created_at timestamptz not null default now(),
  unique (user_id, devid)
);

-- Indexes
create index if not exists idx_device_access_user on public.device_access(user_id);
create index if not exists idx_device_access_devid on public.device_access(devid);

alter table public.device_access enable row level security;

-- Policies on device_access
drop policy if exists "Admins and moderators can manage device access" on public.device_access;
create policy "Admins and moderators can manage device access"
  on public.device_access
  for all
  using (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'moderator'))
  with check (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'moderator'));

drop policy if exists "Users can view their own device access" on public.device_access;
create policy "Users can view their own device access"
  on public.device_access
  for select
  using (auth.uid() = user_id);

-- Tighten RLS on device_config to prevent PII exposure
-- Remove permissive policy and re-add with tenant-aware rules
drop policy if exists "Authenticated users can view device config" on public.device_config;
drop policy if exists "Admins and moderators can manage device config" on public.device_config;

create policy "Admins and moderators can manage device config"
  on public.device_config
  for all
  using (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'moderator'))
  with check (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'moderator'));

create policy "Users can view device config for their devices"
  on public.device_config
  for select
  using (
    exists (
      select 1 from public.device_access da
      where da.user_id = auth.uid() and da.devid = public.device_config.devid
    )
  );