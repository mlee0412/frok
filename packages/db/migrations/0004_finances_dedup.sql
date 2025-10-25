-- Finances import de-duplication
alter table if exists fin_transactions add column if not exists dedup_key text;
create unique index if not exists uidx_fin_transactions_dedup on fin_transactions(dedup_key);
