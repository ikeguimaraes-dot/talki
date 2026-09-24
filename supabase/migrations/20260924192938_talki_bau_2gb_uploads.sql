-- Keep the database and private bucket aligned with the approved 2 GiB audio limit.
-- Global Storage limit was set to 2 GB in the dashboard with spend cap enabled.
alter table public.talki_bau_files drop constraint talki_bau_files_tamanho_check;
alter table public.talki_bau_files add constraint talki_bau_files_tamanho_check
 check (tamanho > 0 and tamanho <= 2147483648);
update storage.buckets set file_size_limit=2147483648 where id='talki-bau';
