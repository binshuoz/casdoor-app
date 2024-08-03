// Copyright 2024 The Casdoor Authors. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import {create} from "zustand";
import * as api from "./api";

export const SYNC_STATUS = {
  ADD: "add",
  EDIT: "edit",
  DELETE: "delete",
};

const preMergeSyncData = (toSyncData) => {
  return toSyncData.reduce((mergedData, currentItem) => {
    const existingItemIndex = mergedData.findIndex(
      item => item.data.accountName === currentItem.data.accountName
            && item.data.secretKey === currentItem.data.secretKey
            && item.data.issuer === currentItem.data.issuer
    );

    if (existingItemIndex !== -1) {
      const existingItem = mergedData[existingItemIndex];
      switch (currentItem.status) {
      case SYNC_STATUS.EDIT:
        mergedData[existingItemIndex] = {
          ...existingItem,
          ...currentItem,
          data: {...existingItem.data, ...currentItem.data},
        };
        break;
      case SYNC_STATUS.DELETE:
        mergedData.splice(existingItemIndex, 1);
        break;
      default:
        break;
      }
    } else {
      mergedData.push(currentItem);
    }
    return mergedData;
  }, []);
};

const applySync = (serverAccountList, toSyncData) => {
  return toSyncData.reduce((acc, syncItem) => {
    switch (syncItem.status) {
    case SYNC_STATUS.ADD:
      if (!acc.some(account => account.accountName === syncItem.data.accountName && account.secretKey === syncItem.data.secretKey)) {
        acc.push(syncItem.data);
      }
      break;
    case SYNC_STATUS.EDIT:
      const indexToEdit = acc.findIndex(account => account.accountName === syncItem.data.accountName && account.secretKey === syncItem.data.secretKey);
      if (indexToEdit !== -1) {
        acc[indexToEdit] = {...acc[indexToEdit], ...syncItem.data, accountName: syncItem.newAccountName};
      }
      break;
    case SYNC_STATUS.DELETE:
      return acc.filter(account => !(account.accountName === syncItem.data.accountName && account.secretKey === syncItem.data.secretKey));
    default:
      break;
    }
    return acc;
  }, [...serverAccountList]);
};

const useSyncStore = create((set, get) => ({
  toSyncData: [],
  syncSignal: false,
  canSync: false,
  syncError: null,

  setCanSync: (value) => set({canSync: value}),

  triggerSync: () => {
    const {canSync} = get();
    if (canSync) {
      set({syncSignal: true, syncError: null});
    }
  },

  resetSyncSignal: () => set({syncSignal: false}),

  setSyncError: (error) => set({syncError: error}),

  clearSyncError: () => set({syncError: null}),

  addToSyncData: (toSyncAccount, status, newAccountName = null) => {
    set((state) => ({
      toSyncData: preMergeSyncData([...state.toSyncData, {
        data: {
          accountName: toSyncAccount.accountName,
          issuer: toSyncAccount.issuer,
          secretKey: toSyncAccount.secretKey,
        },
        status,
        newAccountName: newAccountName || "",
      }]),
    }));
  },

  syncAccounts: async(casdoorServer, userInfo, token) => {
    const {canSync, toSyncData} = get();
    if (!canSync) {
      set({syncError: "Cannot sync: no connection or missing user info"});
      return {success: false};
    }

    try {
      const {mfaAccounts: serverAccountList} = await api.getMfaAccounts(
        casdoorServer.serverUrl,
        userInfo.owner,
        userInfo.name,
        token
      );

      // if (!serverAccountList) {
      //   const error = "Failed to get accounts, there is no account list in server response";
      //   set({syncError: error});
      //   return {success: false, error};
      // }

      if (toSyncData.length === 0) {
        set({syncError: null});
        return {success: true, accountList: serverAccountList ?? []};
      }

      const updatedServerAccountList = applySync(serverAccountList ?? [], toSyncData);

      const {status} = await api.updateMfaAccounts(
        casdoorServer.serverUrl,
        userInfo.owner,
        userInfo.name,
        updatedServerAccountList,
        token
      );

      if (status === "ok") {
        set({toSyncData: [], syncError: null});
      } else {
        set({syncError: "Failed to update accounts on server"});
      }

      return {success: status === "ok", accountList: updatedServerAccountList};
    } catch (error) {
      set({syncError: error.message});
      return {success: false, error: error.message};
    }
  },
}));

export default useSyncStore;
