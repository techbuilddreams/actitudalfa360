'use client';

import { useEffect, useRef } from 'react';
import { analytics, type AnalyticsItem } from '@/lib/analytics';

/** `view_item` una vez por ficha montada (la ref aguanta re-renders y el doble efecto de StrictMode). */
export function TrackView({ item }: { item: AnalyticsItem }) {
  const sent = useRef<string | null>(null);
  useEffect(() => {
    if (sent.current === item.item_id) return;
    sent.current = item.item_id;
    analytics.track({ name: 'view_item', item });
  }, [item]);
  return null;
}
