import { boolean, integer, pgTable, real, text, timestamp, uuid } from "drizzle-orm/pg-core";

// --- Better Auth tables (canonical layout) -----------------------------------
export const user = pgTable("user", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  role: text("role", { enum: ["owner", "admin", "staff"] })
    .notNull()
    .default("staff"),
  org: text("org", { enum: ["EHS", "THC"] }),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  providerId: text("provider_id").notNull(),
  accountId: text("account_id").notNull(),
  password: text("password"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// --- Domain: ActionLog (port of prototype's ActionLog sheet) -----------------
//
// 18 columns from code.gs + a UUID PK. Date fields are stored as ISO date strings
// (YYYY-MM-DD) rather than timestamps because the prototype treats them as dates,
// not instants, and there's no timezone semantics to preserve.

export const action = pgTable("action", {
  id: uuid("id").primaryKey().defaultRandom(),

  // Audit columns
  dateLogged: text("date_logged").notNull(), // YYYY-MM-DD
  createdAt: timestamp("created_at").notNull().defaultNow(),

  // Org + staff (staff submissions are pinned to their own org+name; admins can submit for any)
  org: text("org", { enum: ["EHS", "THC"] }).notNull(),
  staff: text("staff").notNull(),

  // Patient identifier (free-text MRN; not PHI in this app's scope)
  mrn: text("mrn"),

  // Action type — see config/incentive-rules.ts for valid values
  actionType: text("action_type").notNull(),
  location: text("location"),

  // Workflow dates (which ones are required depends on actionType)
  outreach: text("outreach"),
  scheduledOn: text("scheduled_on"),
  apptDate: text("appt_date"),
  reportSent: text("report_sent"),

  // Proof
  proofLink: text("proof_link"),

  // Computed at submit time, frozen on the row
  daysCalc: integer("days_calc").notNull(),
  pctEarned: real("pct_earned").notNull(),
  commission: real("commission").notNull(),

  // Approval workflow
  status: text("status", { enum: ["Pending", "Approved", "Denied", "Disputed"] })
    .notNull()
    .default("Pending"),
  adminNote: text("admin_note"),
  disputeNote: text("dispute_note"),
});

export type ActionRow = typeof action.$inferSelect;
export type ActionInsert = typeof action.$inferInsert;
