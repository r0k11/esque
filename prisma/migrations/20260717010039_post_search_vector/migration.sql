-- Полнотекстовый поиск по материалам с русской морфологией.
--
-- Зачем колонка, а не поиск «на лету»: ILIKE ищет по подстроке и не знает
-- словоформ — по запросу «дизайнеры» не найдёт «дизайнеров». Словарь russian
-- приводит слова к основе, поэтому морфология работает.
--
-- Колонка GENERATED: Postgres пересчитывает её сам при любой записи, поэтому
-- поддерживать её в коде (и не забыть при миграции/админке) не требуется.
--
-- Веса: A — заголовок, B — лид, C — текст. ts_rank учитывает их при ранжировании,
-- так что совпадение в заголовке весит больше, чем в теле статьи.
--
-- jsonb_to_tsvector берёт все строковые значения из блоков контента: это и текст
-- абзацев, и подписи. Служебные ключи ("type", "html") тоже попадут, но они
-- английские и на русские запросы не влияют.

ALTER TABLE "Post" ADD COLUMN "searchVector" tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('russian', coalesce("title", '')), 'A') ||
    setweight(to_tsvector('russian', coalesce("subtitle", '')), 'B') ||
    setweight(jsonb_to_tsvector('russian', "content", '["string"]'), 'C')
  ) STORED;

CREATE INDEX "Post_searchVector_idx" ON "Post" USING GIN ("searchVector");
