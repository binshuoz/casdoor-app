import * as SecureStore from "expo-secure-store";
import {Drizzle, SqliteDriver} from "@drizzle-orm/sqlite";
import {Column, Schema, Table} from "@drizzle-orm/metadata";

const schema = new Schema({
  accounts: new Table("accounts", {
    id: new Column("INTEGER", {autoIncrement: true, primaryKey: true}),
    issuer: new Column("TEXT"),
    account_name: new Column("TEXT"),
  }),
});

const drizzle = new Drizzle(new SqliteDriver("totp.db"), schema);

class TOTPManager {
  constructor() {
    this.drizzle = drizzle;
  }

  async createAccount({secret, accountName, issuer}) {
    try {
      const [accountId] = await this.drizzle.insert("accounts", {
        issuer,
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
      await this.drizzle.delete("accounts", {where: {id: accountId}});
    } catch (error) {
      // console.error("Error deleting account:", error);
    }
  }

  async updateAccount(accountId, {newSecret, newAccountName, newIssuer}) {
    try {
      const [oldAccount] = await this.drizzle.select("accounts", "*", {where: {id: accountId}});

      if (!oldAccount) {
        throw new Error("Account not found");
      }

      if (newSecret) {
        await SecureStore.setItemAsync(accountId.toString(), newSecret);
      }

      await this.drizzle.update("accounts", {
        set: {
          issuer: newIssuer || oldAccount.issuer,
          account_name: newAccountName || oldAccount.account_name,
        },
        where: {id: accountId},
      });
      // console.log("Account updated successfully");
    } catch (error) {
      // console.error("Error updating account:", error);
    }
  }

  async getAccounts() {
    try {
      const accounts = await this.drizzle.select("accounts", "*");
      return accounts;
    } catch (error) {
      // console.error("Error fetching accounts:", error);
      return [];
    }
  }

  async getAccount(accountId) {
    try {
      const [account] = await this.drizzle.select("accounts", "*", {where: {id: accountId}});
      return account;
    } catch (error) {
      // console.error("Error fetching account:", error);
      return null;
    }
  }
}

export default TOTPManager;
