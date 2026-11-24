// Per-profile cache. A null base means creation still needs confirmation from the proxy.
const storageService = (() => {
  const prefix = 'hub.ham.profile.';
  const sessionKey = 'hub.ham.current';
  const legacyKey = 'hub.atlas.leaves.v1';
  const endpoint = location.protocol === 'file:' ? '' : document.querySelector('meta[name="progress-endpoint"]').content.replace(/\/$/, '');
  const validName = name => typeof name === 'string' && /^[a-zA-Z0-9]+$/.test(name);
  const read = name => JSON.parse(localStorage.getItem(prefix + name));
  const write = (name, value) => localStorage.setItem(prefix + name, JSON.stringify(value));
  const inFlight = new Map();
  const problems = new Map();
  const saveTimers = new Map();
  let summarize, onRefresh;
  const locked = (name, fn) => navigator.locks?.request
    ? navigator.locks.request(prefix + name, fn) : Promise.resolve().then(fn);
  const conflictText = 'Danh xưng đã tồn tại. Hãy chọn danh xưng khác.';
  function current() { return localStorage.getItem(sessionKey) || ''; }
  function stamp() { return new Date().toISOString(); }
  function rebase(base, local, remote) {
    const original = new Set(base), latest = new Set(local), merged = new Set(remote);
    for (const id of original) if (!latest.has(id)) merged.delete(id);
    for (const id of latest) if (!original.has(id)) merged.add(id);
    return [...merged].sort();
  }
  function applyPending(items, pending) {
    const result = new Set(items);
    for (const [id, checked] of Object.entries(pending || {})) {
      if (checked) result.add(id);
      else result.delete(id);
    }
    return [...result].sort();
  }
  function withItems(profile, items) {
    return {...profile, completedItems:items, completedLessons:summarize(new Set(items))};
  }
  async function request(name, body) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5500);
    try {
      const response = await fetch(endpoint + '/profiles/' + encodeURIComponent(name), {
        method: body ? 'PUT' : 'GET', cache:'no-store', credentials:'omit',
        signal:controller.signal,
        ...(body && {headers:{'Content-Type':'application/json'}, body:JSON.stringify(body)})
      });
      const value = await response.json().catch(() => null);
      if (response.status === 404 && !body && value?.error === 'missing') return {missing:true};
      if (response.status === 409 && body && value?.error === 'conflict') return {stale:true};
      if (value?.error === 'configuration') throw Error('Worker báo thiếu cấu hình. Kiểm tra Secret GITHUB_TOKEN.');
      if (value?.error === 'storage_unavailable') throw Error(body ? 'Worker chưa ghi được vào GitHub.' : 'Worker chưa đọc được từ GitHub.');
      if (!response.ok) throw Error('Worker trả về HTTP '+response.status+'.');
      if (value?.profile?.username !== name || !Array.isArray(value.profile.completedItems) || !value.sha) throw Error('Phản hồi không đúng định dạng Worker của HUB.');
      return value;
    } finally { clearTimeout(timeout); }
  }
  async function reconcile(name) {
    for (let attempt = 0; attempt < 4; attempt++) {
      const snapshot = read(name);
      if (!snapshot || snapshot.conflict) return;
      const remote = await request(name);
      if (!remote.missing && remote.profile.id !== snapshot.profile.id) {
        await locked(name, () => {
          const latest = read(name);
          if (latest?.profile.id === snapshot.profile.id) write(name, {...latest, conflict:true});
        });
        onRefresh(name);
        return;
      }
      if (remote.missing && snapshot.base !== null) throw Error('Không tìm thấy bản đã đồng bộ trên GitHub.');
      const merged = rebase(snapshot.base || [], snapshot.profile.completedItems, remote.profile?.completedItems || []);
      const items = applyPending(merged, snapshot.pending);
      const candidate = withItems(snapshot.profile, items);
      let confirmed = remote.profile;
      if (!confirmed || JSON.stringify([...confirmed.completedItems].sort()) !== JSON.stringify(items)) {
        candidate.updatedAt = stamp();
        const saved = await request(name, {profile:candidate, sha:remote.sha || null});
        if (saved.stale) continue;
        confirmed = saved.profile;
      }
      const more = await locked(name, () => {
        const latest = read(name);
        if (!latest || latest.profile.id !== snapshot.profile.id) return false;
        // Keep explicit toggles until acknowledged, including toggles made during an uncertain write.
        const pending = {...latest.pending};
        for (const [id,value] of Object.entries(snapshot.pending || {})) {
          if (pending[id] === value) delete pending[id];
        }
        const merged = rebase(snapshot.profile.completedItems, latest.profile.completedItems, confirmed.completedItems);
        const local = applyPending(merged, pending);
        const dirty = Object.keys(pending).length > 0 || JSON.stringify(local) !== JSON.stringify([...confirmed.completedItems].sort());
        write(name, {profile:withItems(dirty?latest.profile:confirmed,local), base:confirmed.completedItems, pending});
        return dirty;
      });
      onRefresh(name);
      if (!more) return;
    }
    throw Error('Đang có thay đổi đồng thời. Hãy thử lại.');
  }
  function synchronize(name) {
    if (!endpoint || !name || !navigator.onLine) return Promise.resolve();
    if (!inFlight.has(name)) {
      const task = reconcile(name)
        .then(() => problems.delete(name))
        .catch(error => problems.set(name, describeError(error)))
        .finally(() => {
          inFlight.delete(name);
          onRefresh(name);
        });
      inFlight.set(name,task);
    }
    return inFlight.get(name);
  }
  function describeError(error) {
    if (error.name === 'AbortError') return 'Worker phản hồi quá chậm.';
    if (error instanceof TypeError) return 'Trình duyệt chưa kết nối được với Worker.';
    return error.message;
  }
  function syncStatus(name) {
    const record = read(name);
    if (!endpoint) return 'Chỉ lưu trên trình duyệt này';
    if (record?.conflict) return 'Trùng danh xưng khi đồng bộ';
    if (problems.has(name)) return problems.get(name);
    if (!navigator.onLine) return 'Ngoại tuyến · Đã lưu trên máy';
    if (inFlight.has(name)) return 'Đang đồng bộ…';
    if (!record || record.base === null || Object.keys(record.pending || {}).length) return 'Đã lưu trên máy · Chờ đồng bộ';
    return 'Đã đồng bộ';
  }
  function pendingNames() {
    const names=[];
    for(let i=0;i<localStorage.length;i++) {
      const k=localStorage.key(i);
      if(k?.startsWith(prefix)) {
        const n=k.slice(prefix.length), record=read(n);
        if(record && !record.conflict && (record.base===null || Object.keys(record.pending || {}).length || JSON.stringify(record.base)!==JSON.stringify(record.profile.completedItems))) names.push(n);
      }
    }
    return names;
  }
  function retry() {
    if(endpoint) for(const name of new Set([current(),...pendingNames()])) synchronize(name);
  }
  async function create(raw, relation, restoreLegacy) {
    if (!validName(raw)) throw Error('Chỉ dùng chữ cái không dấu và số.');
    const name = raw.toLowerCase(), previous = current();
    await locked(name, () => {
      if (read(name)) throw Error(conflictText);
      const previousRecord = previous && read(previous);
      const oldItems = restoreLegacy ? legacyItems() : [];
      const items = previousRecord?.conflict ? previousRecord.profile.completedItems : oldItems;
      const time = stamp();
      write(name,{profile:withItems({username:name,relation,id:crypto.randomUUID(),createdAt:time,updatedAt:time}, items),base:null});
    });
    await synchronize(name);
    const result = read(name);
    if (result.conflict) {
      await locked(name, () => { if (read(name)?.profile.id === result.profile.id) localStorage.removeItem(prefix+name); });
      throw Error(conflictText);
    }
    localStorage.setItem(sessionKey,name);
    if (restoreLegacy) localStorage.removeItem(legacyKey);
    if (previous && read(previous)?.conflict) localStorage.removeItem(prefix+previous);
    return result.profile;
  }
  async function enter(raw) {
    if (!validName(raw)) throw Error('Chỉ dùng chữ cái không dấu và số.');
    const name=raw.toLowerCase();
    if (!read(name) && endpoint) {
      let remote;
      try { remote = await request(name); }
      catch (error) { throw Error(describeError(error)); }
      if (!remote.missing) await locked(name, () => {
        if (!read(name)) write(name,{profile:remote.profile,base:remote.profile.completedItems});
      });
    }
    if (!read(name)) throw Error('Chưa có danh xưng này. Chọn Khai mở tiến trình để tạo mới.');
    localStorage.setItem(sessionKey,name);
    await synchronize(name);
    return read(name).profile;
  }
  async function update(name, ids, checked) {
    const profile = await locked(name, () => {
      if (!name || current() !== name) throw Error('Hãy vào lại tiến trình.');
      const record=read(name), items=new Set(record.profile.completedItems);
      record.pending ||= {};
      for (const id of ids) {
        if (checked) items.add(id);
        else items.delete(id);
        record.pending[id]=checked;
      }
      record.profile=withItems({...record.profile,updatedAt:stamp()},[...items].sort());
      write(name,record);
      return record.profile;
    });
    if (endpoint) {
      clearTimeout(saveTimers.get(name));
      saveTimers.set(name,setTimeout(() => {
        saveTimers.delete(name);
        synchronize(name);
      },350));
    }
    return profile;
  }
  function legacyItems() {
    const items=JSON.parse(localStorage.getItem(legacyKey) || '[]');
    return Array.isArray(items) ? items.filter(id=>typeof id==='string') : [];
  }
  function init(options) {
    ({summarize,onRefresh}=options);
    window.addEventListener('online',retry);
    window.addEventListener('focus',retry);
    window.addEventListener('storage',event => {
      if(event.key===sessionKey || event.key===prefix+current() || !event.key) onRefresh(current());
    });
    retry();
  }
  return {validName, current, read, init, create, enter, update, legacyItems, syncStatus, synchronize, canSync:!!endpoint,
    leave() { localStorage.removeItem(sessionKey); }};
})();
