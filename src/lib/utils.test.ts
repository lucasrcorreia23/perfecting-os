import { describe, expect, it } from "vitest";
import { cn } from "@/lib/utils";

describe("cn", () => {
  it("junta classes verdadeiras e ignora as falsas", () => {
    expect(cn("a", "b")).toBe("a b");
    expect(cn("a", false && "b", null, undefined, "c")).toBe("a c");
  });

  it("resolve condicionais e arrays no estilo clsx", () => {
    expect(cn("base", { ativo: true, oculto: false })).toBe("base ativo");
    expect(cn(["px-2", "py-1"], "text-sm")).toBe("px-2 py-1 text-sm");
  });
});
