import { sqliteTable, integer, text, index } from 'drizzle-orm/sqlite-core';

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

export type VehicleRow = typeof vehicles.$inferSelect;
export type NewVehicleRow = typeof vehicles.$inferInsert;
export type VehicleImageRow = typeof vehicleImages.$inferSelect;
