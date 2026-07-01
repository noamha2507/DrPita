-- Dr. Pita ERP — per-order delivery signatures
-- A single delivery (truck route) stops at several businesses. Previously
-- the driver signed once for the whole route; now each business is signed
-- for separately, so a delivery note must be tied to its specific order.
ALTER TABLE delivery_notes
    ADD COLUMN IF NOT EXISTS order_id     INT REFERENCES orders(order_id),
    ADD COLUMN IF NOT EXISTS signer_name  VARCHAR(255);
