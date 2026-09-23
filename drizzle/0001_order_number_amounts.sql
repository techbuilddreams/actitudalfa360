-- Número de pedido visible (AA-10001) + desglose de montos + búsqueda por email.
-- Un solo ALTER: atómico y una sola reconstrucción de la tabla. Las filas existentes reciben número automáticamente.
ALTER TABLE `orders`
	ADD `order_number` int unsigned NOT NULL AUTO_INCREMENT,
	ADD CONSTRAINT `orders_order_number_uq` UNIQUE(`order_number`),
	ADD `subtotal_cents` int unsigned NOT NULL DEFAULT 0,
	ADD `discount_cents` int unsigned NOT NULL DEFAULT 0,
	ADD `shipping_cents` int unsigned NOT NULL DEFAULT 0,
	ADD `tax_cents` int unsigned NOT NULL DEFAULT 0,
	ADD CONSTRAINT `orders_amounts_ck` CHECK (`subtotal_cents` = 0 OR `subtotal_cents` + `shipping_cents` + `tax_cents` = `total_cents` + `discount_cents`),
	AUTO_INCREMENT = 10001;--> statement-breakpoint
CREATE INDEX `orders_email_idx` ON `orders` (`email`);
