import {create} from "zustand";
import TOTPManager from "./TOTPManager";

const useTotpStore = create((set) => ({
  accounts: [],
  totpManager: new TOTPManager(),

  fetchAccounts: async() => {
    const accounts = await useTotpStore.getState().totpManager.getAccounts();
    set({accounts});
  },

  createAccount: async({secret, accountName, issuer}) => {
    await useTotpStore.getState().totpManager.createAccount({secret, accountName, issuer});
    await useTotpStore.getState().fetchAccounts();
  },

  deleteAccount: async(id) => {
    await useTotpStore.getState().totpManager.deleteAccount(id);
    await useTotpStore.getState().fetchAccounts();
  },

  updateAccount: async(id, {newSecret, newAccountName, newIssuer}) => {
    await useTotpStore.getState().totpManager.updateAccount(id, {newSecret, newAccountName, newIssuer});
    await useTotpStore.getState().fetchAccounts();
  },
}));

export default useTotpStore;
