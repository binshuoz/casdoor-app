import {sql} from "drizzle-orm";
import {integer, sqliteTable, text} from "drizzle-orm/sqlite-core";

export const accountTable = sqliteTable("accounts", {
  id: integer("id", {mode: "number"}).primaryKey({autoIncrement: true}),
  issuer: text("issuer"),
  account_name: text("account_name").notNull(),
  secret: text("secret").notNull(),
  token: integer("token", {mode: "number"}).notNull(),
  is_deleted: integer("is_deleted", {mode: "boolean"}).default(false),
  last_change_time: integer("last_change_time", {mode: "timestamp"}).default(sql`(CURRENT_TIMESTAMP)`),
  last_sync_time: integer("last_sync_time", {mode: "timestamp"}).default(null),
});
