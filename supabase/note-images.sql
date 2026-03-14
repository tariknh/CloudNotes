alter table public.notes
add column if not exists image_path text;

insert into storage.buckets (id, name, public)
values ('note-images', 'note-images', true)
on conflict (id) do nothing;

create policy "Authenticated users can read note images"
on storage.objects
for select
to authenticated
using (bucket_id = 'note-images');

create policy "Authenticated users can upload note images"
on storage.objects
for insert
to authenticated
with check (bucket_id = 'note-images');

create policy "Authenticated users can update note images"
on storage.objects
for update
to authenticated
using (bucket_id = 'note-images')
with check (bucket_id = 'note-images');

create policy "Authenticated users can delete note images"
on storage.objects
for delete
to authenticated
using (bucket_id = 'note-images');