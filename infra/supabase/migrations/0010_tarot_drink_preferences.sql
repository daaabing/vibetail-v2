-- Add structured taste preferences while retaining flavor_tags for older rows.
alter table public.event_attendee_drink_preferences
  add column if not exists texture_tags text[] not null default '{}',
  add column if not exists note_tags text[] not null default '{}',
  add column if not exists description text not null default '';
