-- Correção de DADO, não de schema: nenhuma coluna muda, então
-- src/lib/database.types.ts não precisa acompanhar.
--
-- `updatePost` sempre gravou `cover_alt` com `.trim()`, mas os posts atuais não
-- passaram por ele: vieram de scripts/migrar-posts-sanity.mjs, que escrevia o
-- valor cru do Sanity. Daí um alt com espaço à frente atravessar o produto
-- inteiro até a meta tag do site. O script foi corrigido no mesmo commit — sem
-- isso, reimportar desfaria este update.
--
-- Re-executável: o próprio `where` some com as linhas já limpas.

update public.marketing_posts
   set cover_alt = btrim(cover_alt)
 where cover_alt is not null
   and cover_alt <> btrim(cover_alt);
