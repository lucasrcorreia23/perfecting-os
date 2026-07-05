-- Perfecting v1 — buckets de storage e policies em storage.objects.
-- Caminhos: client-files/{client_id}/{uuid}-{nome-sanitizado} e avatars/{user_id}/avatar.{ext}

-- =============================================================================
-- Buckets
-- =============================================================================

-- Privado; limite de 20 MB no servidor (espelha a validação da UI).
insert into storage.buckets (id, name, public, file_size_limit)
values ('client-files', 'client-files', false, 20971520)
on conflict (id) do nothing;

-- Público; avatares pequenos (5 MB).
insert into storage.buckets (id, name, public, file_size_limit)
values ('avatars', 'avatars', true, 5242880)
on conflict (id) do nothing;

-- =============================================================================
-- Policies — client-files (espelham o RLS de public.client_files)
-- =============================================================================

create policy "client_files_storage_select_interno" on storage.objects
  for select to authenticated
  using (bucket_id = 'client-files' and public.is_interno());

create policy "client_files_storage_insert_interno" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'client-files' and public.is_interno());

create policy "client_files_storage_delete_interno" on storage.objects
  for delete to authenticated
  using (bucket_id = 'client-files' and public.is_interno());

-- Cliente: apenas a pasta do seu próprio client_id.
create policy "client_files_storage_select_cliente" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'client-files'
    and (storage.foldername(name))[1] = public.my_client_id()::text
  );

create policy "client_files_storage_insert_cliente" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'client-files'
    and (storage.foldername(name))[1] = public.my_client_id()::text
  );

-- =============================================================================
-- Policies — avatars (bucket público; escrita só na própria pasta)
-- =============================================================================

create policy "avatars_storage_select_public" on storage.objects
  for select to public
  using (bucket_id = 'avatars');

create policy "avatars_storage_insert_own" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "avatars_storage_update_own" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "avatars_storage_delete_own" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
