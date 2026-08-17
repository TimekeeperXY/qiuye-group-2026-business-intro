(function () {
  const DB_NAME = 'qiuye-group-business-intro-local';
  const DB_VERSION = 2;
  const PLAN_STORE = 'plans';
  const AUDIO_STORE = 'audios';
  const VOICE_STORE = 'voiceProfiles';

  function requestToPromise(request) {
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error('IndexedDB 请求失败'));
    });
  }

  function openDb() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(PLAN_STORE)) {
          const store = db.createObjectStore(PLAN_STORE, { keyPath: 'id' });
          store.createIndex('updatedAt', 'updatedAt');
        }
        if (!db.objectStoreNames.contains(AUDIO_STORE)) {
          const store = db.createObjectStore(AUDIO_STORE, { keyPath: 'key' });
          store.createIndex('signature', 'signature');
          store.createIndex('createdAt', 'createdAt');
        }
        if (!db.objectStoreNames.contains(VOICE_STORE)) {
          const store = db.createObjectStore(VOICE_STORE, { keyPath: 'id' });
          store.createIndex('type', 'type');
          store.createIndex('updatedAt', 'updatedAt');
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error('无法打开浏览器本地存储'));
    });
  }

  async function withStore(storeName, mode, callback) {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, mode);
      const store = transaction.objectStore(storeName);
      let result;
      try {
        result = callback(store);
      } catch (error) {
        reject(error);
        return;
      }
      transaction.oncomplete = () => resolve(result);
      transaction.onerror = () => reject(transaction.error || new Error('IndexedDB 事务失败'));
      transaction.onabort = () => reject(transaction.error || new Error('IndexedDB 事务已取消'));
    });
  }

  function hashText(value) {
    const text = String(value || '');
    let hash = 2166136261;
    for (let index = 0; index < text.length; index += 1) {
      hash ^= text.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0).toString(16).padStart(8, '0');
  }

  function makePlanSignature(pages, manifest) {
    const items = (pages || []).map((page, slot) => {
      const item = (manifest || []).find(entry => entry.page === page) || {};
      return `${slot}:${page}:${hashText(item.narration || '')}`;
    });
    return hashText(items.join('|'));
  }

  function makeAudioKey({ signature, slot, page, voice, textHash }) {
    return [signature, slot, page, voice || 'default', textHash || ''].map(String).join('|');
  }

  function newId() {
    if (window.crypto?.randomUUID) return window.crypto.randomUUID();
    return `plan-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  async function putPlan(plan) {
    const now = Date.now();
    const record = {
      ...plan,
      id: plan.id || newId(),
      createdAt: plan.createdAt || now,
      updatedAt: now
    };
    await withStore(PLAN_STORE, 'readwrite', store => store.put(record));
    return record;
  }

  async function getPlan(id) {
    const db = await openDb();
    const transaction = db.transaction(PLAN_STORE, 'readonly');
    return requestToPromise(transaction.objectStore(PLAN_STORE).get(id));
  }

  async function listPlans() {
    const db = await openDb();
    const transaction = db.transaction(PLAN_STORE, 'readonly');
    const plans = await requestToPromise(transaction.objectStore(PLAN_STORE).getAll());
    return plans.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  }

  async function deletePlan(id) {
    await withStore(PLAN_STORE, 'readwrite', store => store.delete(id));
  }

  async function putAudio({ signature, slot, page, voice, textHash, blob }) {
    const record = {
      key: makeAudioKey({ signature, slot, page, voice, textHash }),
      signature,
      slot,
      page,
      voice,
      textHash,
      blob,
      createdAt: Date.now(),
      size: blob?.size || 0
    };
    await withStore(AUDIO_STORE, 'readwrite', store => store.put(record));
    return record;
  }

  async function getAudio({ signature, slot, page, voice, textHash }) {
    if (!signature) return null;
    const db = await openDb();
    const transaction = db.transaction(AUDIO_STORE, 'readonly');
    return requestToPromise(transaction.objectStore(AUDIO_STORE).get(
      makeAudioKey({ signature, slot, page, voice, textHash })
    ));
  }

  async function countAudio(signature) {
    if (!signature) return 0;
    const db = await openDb();
    const transaction = db.transaction(AUDIO_STORE, 'readonly');
    const index = transaction.objectStore(AUDIO_STORE).index('signature');
    return requestToPromise(index.count(IDBKeyRange.only(signature)));
  }

  async function clearAudio(signature) {
    if (!signature) return;
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(AUDIO_STORE, 'readwrite');
      const store = transaction.objectStore(AUDIO_STORE);
      const index = store.index('signature');
      const request = index.openCursor(IDBKeyRange.only(signature));
      request.onsuccess = () => {
        const cursor = request.result;
        if (!cursor) return;
        cursor.delete();
        cursor.continue();
      };
      request.onerror = () => reject(request.error || new Error('清理本地音频失败'));
      transaction.oncomplete = resolve;
      transaction.onerror = () => reject(transaction.error || new Error('清理本地音频失败'));
    });
  }

  async function putVoiceProfile(profile) {
    const now = Date.now();
    const record = {
      ...profile,
      id: profile.id || newId(),
      type: profile.type || 'clone',
      createdAt: profile.createdAt || now,
      updatedAt: now
    };
    await withStore(VOICE_STORE, 'readwrite', store => store.put(record));
    return record;
  }

  async function getVoiceProfile(id) {
    const db = await openDb();
    const transaction = db.transaction(VOICE_STORE, 'readonly');
    return requestToPromise(transaction.objectStore(VOICE_STORE).get(id));
  }

  async function listVoiceProfiles(type) {
    const db = await openDb();
    const transaction = db.transaction(VOICE_STORE, 'readonly');
    const profiles = type
      ? await requestToPromise(transaction.objectStore(VOICE_STORE).index('type').getAll(IDBKeyRange.only(type)))
      : await requestToPromise(transaction.objectStore(VOICE_STORE).getAll());
    return profiles.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  }

  async function deleteVoiceProfile(id) {
    await withStore(VOICE_STORE, 'readwrite', store => store.delete(id));
  }

  async function requestPersistence() {
    try {
      if (navigator.storage?.persist) await navigator.storage.persist();
    } catch (error) {
      // 浏览器可能拒绝持久化申请，但不影响 IndexedDB 的正常使用。
    }
  }

  window.QiuyeLocalLibrary = {
    hashText,
    makePlanSignature,
    makeAudioKey,
    putPlan,
    getPlan,
    listPlans,
    deletePlan,
    putAudio,
    getAudio,
    countAudio,
    clearAudio,
    putVoiceProfile,
    getVoiceProfile,
    listVoiceProfiles,
    deleteVoiceProfile,
    requestPersistence
  };
})();
