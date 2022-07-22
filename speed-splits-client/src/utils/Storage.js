import { ArgumentNullError } from "./errors";

export default class Storage {
  static Keys = {
    CURRENT_SPLIT: { id: "currentSplit", temporary: true },
    CURRENT_TIME: { id: "currentTime", temporary: true },
    SPLITS: { id: "splits", temporary: true },
    STATUS: { id: "status", temporary: true },
    TIMESTAMP_REF: { id: "timestampRef", temporary: true },
    RECORDED_TIMES: { id: "recordedTimes", temporary: true },
    ERROR_LOG: { id: "errorLog", temporary: false },
    SETTINGS: { id: "settings", temporary: false },
    RUNS: { id: "runs", temporary: false },
    SELECTED_RUN: { id: "selectedRun", temporary: false },
  };

  static AddOrUpdate(name, item, useSerializer = true, allowNulls = true) {
    this.#log("addOrUpdateStart", name, JSON.stringify(item));
    const key = this.#getKey(name);
    if (!allowNulls) ArgumentNullError.Guard("item", item);
    const value = useSerializer ? JSON.stringify(item) : item;
    const store = this.#getStore(key);
    store.setItem(key.id, value);
    this.#log("addOrUpdateEnd", key.id, value);
  }

  static Get(name, useDeserializer = true) {
    this.#log("getStart", name, null);
    const key = this.#getKey(name);
    const store = this.#getStore(key);
    const val = store.getItem(key.id);
    const value = useDeserializer && val ? JSON.parse(val) : val;
    this.#log("getEnd", key.id, value);
    return value;
  }

  static Delete(name) {
    const key = this.#getKey(name);
    const store = this.#getStore(key);
    store.removeItem(key.id);
    this.#log("deleteSingle", key.id, null);
  }

  static DeleteAll(onlyTemp = true) {
    if (onlyTemp) sessionStorage.clear();
    for (const key in Storage.Keys) {
      const store = this.#getStore(key);
      store.removeItem(key.id);
      this.#log("deleteAll", key.id, null);
    }
  }

  static #getKey(name, ensureValid = true) {
    this.#log("getKeyStart", name, null);
    ArgumentNullError.Guard("name", name);
    let foundKey;
    for (let storageKey in Storage.Keys) {
      const key = Storage.Keys[storageKey];
      if (key.id === name) {
        this.#log("getKeyFound", name, foundKey);
        foundKey = key;
        break;
      }
    }
    if (ensureValid) ArgumentNullError.Guard("foundKey", foundKey);
    return foundKey;
  }

  static #getStore(key) {
    return key.temporary ? sessionStorage : localStorage;
  }

  static #logActions = true;
  static #log(action, name, value) {
    if (this.#logActions)
      console.info(`action: ${action} - name: ${name}, value: ${value}`);
  }
}
