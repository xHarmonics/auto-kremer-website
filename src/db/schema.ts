import { sqliteTable, integer, text, index, uniqueIndex } from 'drizzle-orm/sqlite-core';

export const vehicles = sqliteTable(
  'vehicles',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    slug: text('slug').notNull().unique(),
    title: text('title').notNull(),
    brand: text('brand').notNull(),
    model: text('model').notNull(),
    year: integer('year').notNull(),
    mileageKm: integer('mileage_km'),
    powerPs: integer('power_ps'),
    powerKw: integer('power_kw'),
    displacementCc: integer('displacement_cc'),
    engineType: text('engine_type'),
    transmission: text('transmission').notNull(),
    drivetrain: text('drivetrain'),
    fuelType: text('fuel_type').notNull().default('Benzin'),
    exteriorColor: text('exterior_color'),
    interiorColor: text('interior_color'),
    priceCents: integer('price_cents'),
    priceOnRequest: integer('price_on_request', { mode: 'boolean' })
      .notNull()
      .default(false),
    vatDeductible: integer('vat_deductible', { mode: 'boolean' })
      .notNull()
      .default(false),
    status: text('status', { enum: ['available', 'reserved', 'sold'] })
      .notNull()
      .default('available'),
    featured: integer('featured', { mode: 'boolean' }).notNull().default(false),
    summary: text('summary').notNull(),
    description: text('description').notNull(),
    highlightsJson: text('highlights_json').notNull().default('[]'),
    mobileDeUrl: text('mobile_de_url'),
    sortOrder: integer('sort_order').notNull().default(0),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (table) => [
    index('idx_vehicles_status_sort').on(table.status, table.sortOrder),
    index('idx_vehicles_brand').on(table.brand),
  ]
);

export const vehicleImages = sqliteTable(
  'vehicle_images',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    vehicleId: integer('vehicle_id')
      .notNull()
      .references(() => vehicles.id, { onDelete: 'cascade' }),
    url: text('url').notNull(),
    alt: text('alt').notNull(),
    width: integer('width').notNull().default(1280),
    height: integer('height').notNull().default(854),
    sortOrder: integer('sort_order').notNull().default(0),
  },
  (table) => [index('idx_vehicle_images_vehicle').on(table.vehicleId, table.sortOrder)]
);

export const products = sqliteTable(
  'products',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    slug: text('slug').notNull().unique(),
    oemNumber: text('oem_number').notNull().unique(),
    oemNormalized: text('oem_normalized').notNull(),
    title: text('title').notNull(),
    category: text('category').notNull(),
    condition: text('condition', { enum: ['new_nos', 'used_tested'] })
      .notNull()
      .default('new_nos'),
    description: text('description').notNull(),
    priceCents: integer('price_cents').notNull(),
    vatRatePercent: integer('vat_rate_percent').notNull().default(19),
    stockQuantity: integer('stock_quantity').notNull().default(0),
    reservedQuantity: integer('reserved_quantity').notNull().default(0),
    imageUrl: text('image_url').notNull(),
    imageAlt: text('image_alt').notNull(),
    featured: integer('featured', { mode: 'boolean' }).notNull().default(false),
    active: integer('active', { mode: 'boolean' }).notNull().default(true),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (table) => [
    index('idx_products_oem_norm').on(table.oemNormalized),
    index('idx_products_category').on(table.category),
    index('idx_products_active').on(table.active, table.featured),
  ]
);

export const productModels = sqliteTable(
  'product_models',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    productId: integer('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    modelSlug: text('model_slug').notNull(),
    modelLabel: text('model_label').notNull(),
  },
  (table) => [
    index('idx_product_models_slug').on(table.modelSlug),
    uniqueIndex('uq_product_model').on(table.productId, table.modelSlug),
  ]
);

export const legacyProductRedirects = sqliteTable('legacy_product_redirects', {
  oldWixSlug: text('old_wix_slug').primaryKey(),
  targetProductSlug: text('target_product_slug').notNull(),
});

export const orders = sqliteTable(
  'orders',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    orderNumber: text('order_number').notNull().unique(),
    stripeSessionId: text('stripe_session_id').unique(),
    status: text('status', {
      enum: ['pending', 'paid', 'expired', 'cancelled'],
    })
      .notNull()
      .default('pending'),
    shippingZone: text('shipping_zone', { enum: ['DE', 'EU', 'WORLD'] })
      .notNull()
      .default('DE'),
    subtotalCents: integer('subtotal_cents').notNull(),
    shippingCents: integer('shipping_cents').notNull(),
    totalCents: integer('total_cents').notNull(),
    vatCents: integer('vat_cents').notNull(),
    customerEmail: text('customer_email'),
    customerName: text('customer_name'),
    stripeMode: text('stripe_mode').notNull().default('sandbox'),
    reservedUntil: text('reserved_until').notNull(),
    paidAt: text('paid_at'),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (table) => [
    index('idx_orders_status').on(table.status),
    index('idx_orders_reserved_until').on(table.status, table.reservedUntil),
  ]
);

export const orderItems = sqliteTable(
  'order_items',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    orderId: integer('order_id')
      .notNull()
      .references(() => orders.id, { onDelete: 'cascade' }),
    productId: integer('product_id')
      .notNull()
      .references(() => products.id),
    oemNumber: text('oem_number').notNull(),
    title: text('title').notNull(),
    unitPriceCents: integer('unit_price_cents').notNull(),
    quantity: integer('quantity').notNull(),
    lineTotalCents: integer('line_total_cents').notNull(),
  },
  (table) => [index('idx_order_items_order').on(table.orderId)]
);

export const stripeWebhookEvents = sqliteTable('stripe_webhook_events', {
  eventId: text('event_id').primaryKey(),
  eventType: text('event_type').notNull(),
  processedAt: text('processed_at').notNull(),
});

export const inquiries = sqliteTable(
  'inquiries',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    inquiryNumber: text('inquiry_number').notNull().unique(),
    type: text('type', { enum: ['consignment', 'contact'] }).notNull(),
    topic: text('topic').notNull(),
    senderName: text('sender_name').notNull(),
    senderEmail: text('sender_email').notNull(),
    senderPhone: text('sender_phone'),
    subject: text('subject').notNull(),
    message: text('message').notNull(),
    payloadJson: text('payload_json').notNull().default('{}'),
    mediaKeysJson: text('media_keys_json').notNull().default('[]'),
    status: text('status', { enum: ['new', 'in_progress', 'closed'] })
      .notNull()
      .default('new'),
    createdAt: text('created_at').notNull(),
  },
  (table) => [
    index('idx_inquiries_type_created').on(table.type, table.createdAt),
    index('idx_inquiries_status').on(table.status),
  ]
);

export type VehicleRow = typeof vehicles.$inferSelect;
export type NewVehicleRow = typeof vehicles.$inferInsert;
export type VehicleImageRow = typeof vehicleImages.$inferSelect;
export type ProductRow = typeof products.$inferSelect;
export type ProductModelRow = typeof productModels.$inferSelect;
export type OrderRow = typeof orders.$inferSelect;
export type OrderItemRow = typeof orderItems.$inferSelect;
export type InquiryRow = typeof inquiries.$inferSelect;
