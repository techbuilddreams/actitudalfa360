import { usd } from '@/domain/money';

/**
 * Precios del catálogo: única fuente. Los usan el catálogo (lo que cobra Stripe)
 * y el copy (lo que se lee), así no pueden separarse.
 */
export const PRICES = {
  taza: usd(2499),
  vaso: usd(3499),
} as const;
