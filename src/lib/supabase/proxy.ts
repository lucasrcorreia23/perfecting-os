import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseEnv, isSupabaseConfigured } from "@/lib/env";

const PUBLIC_PATHS = ["/login", "/cadastro", "/recuperar"];

// API consumida pelo site externo: não tem sessão nem cookie.
const PUBLIC_API_PREFIX = "/api/publico";

function isPublicPath(pathname: string) {
  return PUBLIC_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
}

export async function updateSession(request: NextRequest) {
  // Precisa vir antes de tudo: é o branch de redirect que transformaria o
  // preflight OPTIONS num 307 para /login, e o browser reportaria isso como
  // uma falha de CORS opaca. Também evita um getUser() por request do site.
  if (request.nextUrl.pathname.startsWith(PUBLIC_API_PREFIX)) {
    return NextResponse.next({ request });
  }

  // Sem env configurada (ex.: build/preview), não bloqueia nada.
  if (!isSupabaseConfigured()) {
    return NextResponse.next({ request });
  }

  const { url, anonKey } = getSupabaseEnv();

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(url!, anonKey!, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options),
        );
      },
    },
  });

  // Importante: não inserir lógica entre createServerClient e getUser —
  // é o getUser que revalida/renova o token.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && !isPublicPath(request.nextUrl.pathname)) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    redirectUrl.search = "";
    const redirectResponse = NextResponse.redirect(redirectUrl);
    // Preserva cookies de sessão eventualmente renovados.
    supabaseResponse.cookies
      .getAll()
      .forEach((cookie) => redirectResponse.cookies.set(cookie));
    return redirectResponse;
  }

  return supabaseResponse;
}
