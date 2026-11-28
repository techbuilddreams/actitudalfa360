import type { MetadataRoute } from 'next';
import { site } from '@/config/site';
import { robotsPolicy } from '@/lib/robots-policy';

/** Producción: abierto a buscadores y a buscadores con IA; bots de entrenamiento fuera. Staging: cerrado. */
export default function robots(): MetadataRoute.Robots {
  return robotsPolicy({ isStaging: site.isStaging, siteUrl: site.url });
}
