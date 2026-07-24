-- KioscoApp: tablas nuevas + bucket de backups. Correr una sola vez en el SQL Editor de Supabase.
-- No toca ninguna tabla de PeluApp (licencias_vendidas, pagos, etc.) — todo separado.

-- ── Tablas ────────────────────────────────────────────────────────────────

create table if not exists kioscoapp_licencias (
    id             bigint generated always as identity primary key,
    kiosco         text not null,
    nombre_contacto text,
    contacto       text,
    telefono       text,
    machine_id     text not null,
    nombre_maquina text,
    desde          date not null,
    vence          date not null,
    licencia_key   text not null,
    notas          text,
    precio         numeric,
    creada_en      timestamptz not null default now()
);

create index if not exists idx_kioscoapp_licencias_kiosco on kioscoapp_licencias (kiosco);
create index if not exists idx_kioscoapp_licencias_machine on kioscoapp_licencias (machine_id);

create table if not exists kioscoapp_pagos (
    id         bigint generated always as identity primary key,
    kiosco     text not null,
    monto      numeric not null,
    pagado_en  date not null,
    metodo     text not null default 'Transferencia',
    nota       text
);

create index if not exists idx_kioscoapp_pagos_kiosco on kioscoapp_pagos (kiosco);

-- RLS: estas tablas solo se tocan desde las API routes de peluapp-admin, que usan la
-- service_role key (bypassea RLS). No hace falta abrir políticas para anon/authenticated.
alter table kioscoapp_licencias enable row level security;
alter table kioscoapp_pagos enable row level security;

-- ── Storage: bucket de backups ───────────────────────────────────────────

insert into storage.buckets (id, name, public)
values ('kioscoapp-backups', 'kioscoapp-backups', false)
on conflict (id) do nothing;

-- La app (con la clave "anon") puede subir/pisar su propio backup, pero no leer ni listar
-- ningún archivo del bucket. Las descargas desde el panel usan la service_role key (server-side),
-- que ignora RLS — por eso no hace falta ninguna política de "select" acá.
create policy "kioscoapp anon puede subir backups"
on storage.objects for insert
to anon
with check (bucket_id = 'kioscoapp-backups');

create policy "kioscoapp anon puede sobreescribir su backup"
on storage.objects for update
to anon
using (bucket_id = 'kioscoapp-backups')
with check (bucket_id = 'kioscoapp-backups');
