import type { MetadataRoute } from 'next';

/** Bots de IA que buscan para responder a una persona: permitidos (nos citan y nos enlazan). */
export const AI_SEARCH_BOTS = ['OAI-SearchBot', 'ChatGPT-User', 'PerplexityBot', 'Perplexity-User', 'Claude-SearchBot', 'Claude-User'] as const;

/** Bots que recogen texto para ENTRENAR modelos: bloqueados (decisión de Luis, 2026-11-28). */
export const AI_TRAINING_BOTS = ['GPTBot', 'Google-Extended', 'ClaudeBot', 'CCBot', 'Applebot-Extended', 'meta-externalagent', 'Bytespider'] as const;

const PRIVATE_PATHS = ['/api/', '/gracias'];

/**
 * Política de robots.txt, pura. Un bot que encaja en un grupo específico IGNORA el grupo `*`:
 * por eso los grupos de bots de búsqueda repiten los `disallow` privados.
 */
export function robotsPolicy({ isStaging, siteUrl }: { isStaging: boolean; siteUrl: string }): MetadataRoute.Robots {
  if (isStaging) return { rules: [{ userAgent: '*', disallow: '/' }] };
  return {
    rules: [
      { userAgent: '*', allow: '/', disallow: PRIVATE_PATHS },
      ...AI_SEARCH_BOTS.map((userAgent) => ({ userAgent, allow: '/', disallow: PRIVATE_PATHS })),
      ...AI_TRAINING_BOTS.map((userAgent) => ({ userAgent, disallow: '/' })),
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
