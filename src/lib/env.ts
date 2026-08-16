export function getSupabaseEnv() {
  return {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  };
}

export function isSupabaseConfigured(): boolean {
  const { url, anonKey } = getSupabaseEnv();
  return Boolean(url && anonKey);
}

// Chave service role: ignora RLS, então JAMAIS pode ganhar prefixo NEXT_PUBLIC_.
// Usada só dentro de app/api/publico/* (via src/lib/supabase/service.ts).
export function getServiceRoleKey(): string | undefined {
  return process.env.SUPABASE_SERVICE_ROLE_KEY;
}

export function getMarketingEnv() {
  return {
    // Token secreto: só no servidor do site externo. Concede leitura + envio.
    apiToken: process.env.MARKETING_API_TOKEN,
    // Token publicável: pode ir ao bundle do browser do site. Só envio de respostas.
    publicToken: process.env.MARKETING_PUBLIC_TOKEN,
    // Origens permitidas no CORS, separadas por vírgula.
    allowedOrigins: parseOrigins(process.env.MARKETING_ALLOWED_ORIGINS),
    // Sal do HMAC do IP (LGPD: nunca guardamos o IP cru).
    ipSalt: process.env.MARKETING_IP_SALT,
  };
}

// URL pública do site do blog — só para montar prévias e links no OS.
export function getSiteUrl(): string {
  return (process.env.NEXT_PUBLIC_MARKETING_SITE_URL || "https://perfecting.com.br").replace(
    /\/$/,
    "",
  );
}

export function isMarketingApiConfigured(): boolean {
  const { url } = getSupabaseEnv();
  const { apiToken } = getMarketingEnv();
  return Boolean(url && getServiceRoleKey() && apiToken);
}

export function getCalculatorEnv() {
  return {
    // Segredo do HMAC que deriva o token dos links da calculadora (≥ 32 bytes
    // aleatórios). Só o hash do token vai ao banco; com este segredo o servidor
    // rederiva o token para "copiar link" sem nunca persisti-lo.
    linkSecret: process.env.CALCULATOR_LINK_SECRET,
  };
}

export function isCalculatorConfigured(): boolean {
  const { url } = getSupabaseEnv();
  const { linkSecret } = getCalculatorEnv();
  return Boolean(url && getServiceRoleKey() && linkSecret);
}

function parseOrigins(value: string | undefined): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((origin) => origin.trim().replace(/\/$/, ""))
    .filter(Boolean);
}
