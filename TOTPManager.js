import {eq, sql} from "drizzle-orm";
import {drizzle} from "drizzle-orm/expo-sqlite";
import {integer, sqliteTable, text} from "drizzle-orm/sqlite-core";
import * as SecureStore from "expo-secure-store";
import {openDatabaseSync} from "expo-sqlite/next";

const accountTable = sqliteTable("accounts", {
  id: integer("id", {mode: "number"}).primaryKey({autoIncrement: true}),
  issuer: text("issuer"),
  account_name: text("account_name").notNull(),
  secret: text("secret").notNull(),
  is_deleted: integer("is_deleted", {mode: "boolean"}).default(false),
  last_change_time: integer("last_change_time", {mode: "timestamp"}).default(sql`(CURRENT_TIMESTAMP)`),
  last_sync_time: integer("last_sync_time", {mode: "timestamp"}).default(null),
});

const db = drizzle(openDatabaseSync("totp.db", {enableChangeListener: true}));

class TOTPManager {
  constructor() {
    this.db = db;
  }

  async createAccount({secret, accountName, issuer}) {
    try {
      const [accountId] = await this.db.insert(accountTable).values({
        issuer: issuer,
        account_name: accountName,
      });

      await SecureStore.setItemAsync(accountId.toString(), secret);
    } catch (error) {
      // handle the error here
    }
  }

  async deleteAccount(accountId) {
    try {
      await SecureStore.deleteItemAsync(accountId.toString());
      await this.db.delete(accountTable).where(eq(accountTable.id, accountId));
    } catch (error) {
      // console.error("Error deleting account:", error);
    }
  }

  async updateAccount(accountId, {newSecret, newAccountName, newIssuer}) {
    try {
      const [oldAccount] = await this.db.select().from(accountTable).where(eq(accountTable.id, accountId));

      if (!oldAccount) {
        throw new Error("Account not found");
      }

      if (newSecret) {
        await SecureStore.setItemAsync(accountId.toString(), newSecret);
      }

      await this.db.update(accountTable).set({
        issuer: newIssuer || oldAccount.issuer,
        account_name: newAccountName || oldAccount.account_name,
      }).where(eq(accountTable.id, accountId));
      // console.log("Account updated successfully");
    } catch (error) {
      // console.error("Error updating account:", error);
    }
  }

  async getAccounts() {
    try {
      return (await this.db.select().from(accountTable));
    } catch (error) {
      // console.error("Error fetching accounts:", error);
      return [];
    }
  }

  async getAccountsWithoutId() {
    try {
      return (await this.db.select().from(accountTable)).map(({id, ...account}) => account);
    } catch (error) {
      // console.error("Error fetching accounts:", error);
      return [];
    }
  }

  async getAccount(accountId) {
    try {
      const [account] = await this.db.select().from(accountTable).where(eq(accountTable.id, accountId));
      return account;
    } catch (error) {
      // console.error("Error fetching account:", error);
      return null;
    }
  }

  async createOrUpdateAccount({secret, accountName, issuer, accountId}) {
    if (accountId) {
      return this.updateAccount(accountId, {newSecret: secret, newAccountName: accountName, newIssuer: issuer});
    } else {
      return this.createAccount({secret, accountName, issuer});
    }
  }
}

export default TOTPManager;
