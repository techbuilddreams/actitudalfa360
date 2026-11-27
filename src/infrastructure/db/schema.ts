import { sql } from 'drizzle-orm';
import { char, check, index, integer, jsonb, pgEnum, pgTable, text, timestamp, uniqueIndex, uuid, varchar } from 'drizzle-orm/pg-core';
import type { OrderItem, OrderStatus, ShippingAddress } from '@/domain/order';

const STATUSES = ['paid', 'fulfillment_pending', 'fulfillment_processing', 'fulfillment_created', 'fulfillment_failed'] as const satisfies readonly OrderStatus[];

export const orderStatus = pgEnum('order_status', STATUSES);

const tz = { withTimezone: true, mode: 'date' } as const;

/**
 * Pedidos. Lo que drizzle-kit no sabe generar vive a mano en la migración:
 * trigger de `updated_at` (pg no tiene ON UPDATE), RLS y REVOKE a anon/authenticated.
 */
export const orders = pgTable(
  'orders',
  {
    id: uuid('id').primaryKey(),
    // Número visible (AA-10001): lo asigna Postgres (identity) sin carreras; el cliente no puede fijarlo.
    orderNumber: integer('order_number').notNull().generatedAlwaysAsIdentity({ startWith: 10001 }),
    paymentRef: varchar('payment_ref', { length: 255 }).notNull(),
    status: orderStatus('status').notNull(),
    lines: jsonb('lines').$type<OrderItem[]>().notNull(),
    totalCents: integer('total_cents').notNull(),
    subtotalCents: integer('subtotal_cents').notNull().default(0),
    discountCents: integer('discount_cents').notNull().default(0),
    shippingCents: integer('shipping_cents').notNull().default(0),
    taxCents: integer('tax_cents').notNull().default(0),
    currency: char('currency', { length: 3 }).notNull(),
    // text: Stripe admite correos de hasta 512 caracteres; un límite aquí perdería un pago cobrado.
    email: text('email'),
    phone: varchar('phone', { length: 40 }),
    shipping: jsonb('shipping').$type<ShippingAddress | null>(),
    fulfillmentRef: varchar('fulfillment_ref', { length: 64 }),
    // Hora del reclamo según el reloj de la BASE (now()), nunca el de la app.
    claimedAt: timestamp('claimed_at', tz),
    // Token de turno: lo genera la base en cada reclamo; solo quien lo tiene puede cerrar el pedido.
    claimToken: uuid('claim_token'),
    createdAt: timestamp('created_at', tz).notNull(),
    updatedAt: timestamp('updated_at', tz).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('orders_order_number_uq').on(t.orderNumber),
    uniqueIndex('orders_payment_ref_uq').on(t.paymentRef), // idempotencia a nivel de base de datos
    // Índice compuesto: cubre "pedidos por estado, recientes primero" (panel/reintentos) y el filtro por estado.
    index('orders_status_created_idx').on(t.status, t.createdAt),
    index('orders_created_idx').on(t.createdAt),
    index('orders_email_idx').on(t.email), // búsqueda de pedidos por cliente (soporte / "mis pedidos")
    // Centavos nunca negativos (Postgres no tiene UNSIGNED).
    check('orders_total_cents_ck', sql`${t.totalCents} >= 0`),
    check('orders_subtotal_cents_ck', sql`${t.subtotalCents} >= 0`),
    check('orders_discount_cents_ck', sql`${t.discountCents} >= 0`),
    check('orders_shipping_cents_ck', sql`${t.shippingCents} >= 0`),
    check('orders_tax_cents_ck', sql`${t.taxCents} >= 0`),
    check('orders_currency_ck', sql`${t.currency} = 'usd'`),
    // CASE y no AND: Postgres no garantiza el orden de evaluación y jsonb_array_length falla con un objeto.
    check('orders_lines_ck', sql`CASE WHEN jsonb_typeof(${t.lines}) = 'array' THEN jsonb_array_length(${t.lines}) > 0 ELSE false END`),
    // El dinero cuadra: subtotal + envío + impuesto = total + descuento. Sin desglose ⇒ TODO el desglose en 0.
    // bigint: la suma de varios integer no puede desbordar dentro del CHECK.
    check('orders_amounts_ck', sql`(${t.subtotalCents} = 0 AND ${t.discountCents} = 0 AND ${t.shippingCents} = 0 AND ${t.taxCents} = 0) OR ${t.subtotalCents}::bigint + ${t.shippingCents} + ${t.taxCents} = ${t.totalCents}::bigint + ${t.discountCents}`),
    // processing ⇒ hay reclamo con hora y token. Hace imposible el estado "atascado para siempre"
    // (processing sin hora nunca vence) en vez de tolerarlo en cada consulta.
    check('orders_processing_claim_ck', sql`${t.status} <> 'fulfillment_processing' OR (${t.claimedAt} IS NOT NULL AND ${t.claimToken} IS NOT NULL)`),
  ],
);
