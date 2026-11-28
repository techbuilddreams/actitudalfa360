import { describe, expect, it } from 'vitest';
import { AI_SEARCH_BOTS, AI_TRAINING_BOTS, robotsPolicy } from '@/lib/robots-policy';

const SITE = 'https://actitudalfa360.com';
const prod = () => robotsPolicy({ isStaging: false, siteUrl: SITE });
const rules = (r = prod()) => [r.rules].flat();
const rulesFor = (ua: string, r = prod()) => rules(r).filter((x) => [x.userAgent].flat().includes(ua));

describe('robots: producción', () => {
  it.each(['GPTBot', 'Google-Extended', 'ClaudeBot', 'CCBot', 'Applebot-Extended', 'meta-externalagent', 'Bytespider'])(
    'bloquea el bot de entrenamiento %s entero',
    (bot) => {
      expect(AI_TRAINING_BOTS).toContain(bot);
      const [rule] = rulesFor(bot);
      expect(rule?.disallow).toBe('/');
      expect(rule?.allow).toBeUndefined();
    },
  );

  it.each(['OAI-SearchBot', 'ChatGPT-User', 'PerplexityBot', 'Perplexity-User', 'Claude-SearchBot', 'Claude-User'])(
    'permite el bot de búsqueda %s y repite los disallow de `*` (un grupo propio ignora a `*`)',
    (bot) => {
      expect(AI_SEARCH_BOTS).toContain(bot);
      const [rule] = rulesFor(bot);
      expect(rule?.allow).toBe('/');
      expect([rule?.disallow].flat()).toEqual(['/api/', '/gracias']);
    },
  );

  it('Googlebot y Bingbot caen en `*`: permitido salvo /api/ y /gracias, sin grupo que los cierre', () => {
    expect(rulesFor('Googlebot')).toEqual([]);
    expect(rulesFor('Bingbot')).toEqual([]);
    const star = rulesFor('*')[0];
    expect(star?.allow).toBe('/');
    expect([star?.disallow].flat()).toEqual(['/api/', '/gracias']);
  });

  it('ningún bot aparece en dos grupos y declara el sitemap', () => {
    const uas = rules().flatMap((r) => [r.userAgent].flat());
    expect(new Set(uas).size).toBe(uas.length);
    expect(prod().sitemap).toBe(`${SITE}/sitemap.xml`);
  });
});

describe('robots: staging', () => {
  it('cierra todo para todos y no anuncia sitemap', () => {
    const r = robotsPolicy({ isStaging: true, siteUrl: SITE });
    expect(r.rules).toEqual([{ userAgent: '*', disallow: '/' }]);
    expect(r.sitemap).toBeUndefined();
  });
});
