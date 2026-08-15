import { describe, expect, it } from "vitest";
import { filterPosts, type PostRow } from "./posts-view";

const NOW = new Date("2026-08-04T12:00:00.000Z");

function post(overrides: Partial<PostRow> & { id: string }): PostRow {
  return {
    title: "Como treinar times com IA",
    slug: "como-treinar-times-com-ia",
    status: "rascunho",
    published_at: null,
    tags: [],
    updated_at: "2026-08-01T00:00:00.000Z",
    reading_minutes: 3,
    ...overrides,
  };
}

const rascunho = post({ id: "1" });
const agendado = post({
  id: "2",
  title: "Post agendado",
  slug: "post-agendado",
  status: "publicado",
  published_at: "2026-09-01T00:00:00.000Z",
});
const publicado = post({
  id: "3",
  title: "Post no ar",
  slug: "post-no-ar",
  status: "publicado",
  published_at: "2026-07-01T00:00:00.000Z",
  tags: ["ia", "treinamento"],
});
const arquivado = post({
  id: "4",
  title: "Post antigo",
  slug: "post-antigo",
  status: "arquivado",
  published_at: "2025-01-01T00:00:00.000Z",
});

const TODOS = [rascunho, agendado, publicado, arquivado];

describe("filterPosts", () => {
  it("sem busca nem filtro devolve tudo", () => {
    expect(filterPosts(TODOS, "", "todos", NOW)).toHaveLength(4);
  });

  it("filtra pelo estado derivado, distinguindo agendado de publicado", () => {
    expect(filterPosts(TODOS, "", "agendado", NOW).map((p) => p.id)).toEqual(["2"]);
    expect(filterPosts(TODOS, "", "publicado", NOW).map((p) => p.id)).toEqual(["3"]);
    expect(filterPosts(TODOS, "", "rascunho", NOW).map((p) => p.id)).toEqual(["1"]);
    expect(filterPosts(TODOS, "", "arquivado", NOW).map((p) => p.id)).toEqual(["4"]);
  });

  it("busca por título, slug e tag, ignorando caixa e espaços", () => {
    expect(filterPosts(TODOS, "  TREINAR ", "todos", NOW).map((p) => p.id)).toEqual([
      "1",
    ]);
    expect(filterPosts(TODOS, "post-no-ar", "todos", NOW).map((p) => p.id)).toEqual([
      "3",
    ]);
    expect(filterPosts(TODOS, "treinamento", "todos", NOW).map((p) => p.id)).toEqual([
      "3",
    ]);
  });

  it("combina busca e filtro de estado", () => {
    expect(filterPosts(TODOS, "post", "publicado", NOW).map((p) => p.id)).toEqual([
      "3",
    ]);
    expect(filterPosts(TODOS, "post", "rascunho", NOW)).toEqual([]);
  });

  it("devolve vazio quando nada casa", () => {
    expect(filterPosts(TODOS, "inexistente", "todos", NOW)).toEqual([]);
  });
});
