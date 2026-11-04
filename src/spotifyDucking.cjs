const { execFile } = require('node:child_process');
const { promisify } = require('node:util');
const execute = promisify(execFile);

// Change only this receiver's PulseAudio stream. Never change the TV's master
// volume, and never restore over a volume adjustment made by the user.
class SpotifyDucking {
  constructor({ run = execute, interval = setInterval, clear = clearInterval } = {}) {
    this.run = run; this.interval = interval; this.clear = clear;
    this.active = false; this.owned = new Map(); this.ignored = new Set(); this.queue = Promise.resolve(); this.timer = null;
  }
  setActive(active) {
    this.active = Boolean(active);
    if (this.active && !this.timer) { this.timer = this.interval(() => { void this.refresh().catch(() => {}); }, 2000); this.timer.unref?.(); }
    if (!this.active && this.timer) { this.clear(this.timer); this.timer = null; }
    return this.refresh();
  }
  refresh() {
    const next = this.queue.catch(() => {}).then(() => this.reconcile());
    this.queue = next; return next;
  }
  async reconcile() {
    let streams;
    try { streams = JSON.parse((await this.run('pactl', ['--format=json', 'list', 'sink-inputs'], { timeout: 3000 })).stdout); }
    catch { return { active: this.active, streams: 0 }; }
    const receiver = streams.filter(s => s.properties?.['application.process.binary'] === 'librespot' || /^librespot$/i.test(s.properties?.['application.name'] || ''));
    const present = new Set(receiver.map(s => String(s.index)));
    for (const id of this.owned.keys()) if (!present.has(id)) this.owned.delete(id);
    for (const id of this.ignored) if (!present.has(id)) this.ignored.delete(id);
    for (const stream of receiver) {
      const id = String(stream.index), current = Object.values(stream.volume || {}).map(v => Number(v.value));
      if (!current.length || current.some(v => !Number.isFinite(v))) continue;
      const saved = this.owned.get(id);
      const unchanged = saved && current.length === saved.ducked.length && current.every((v, i) => Math.abs(v - saved.ducked[i]) <= 2);
      if (saved && !unchanged) { this.owned.delete(id); this.ignored.add(id); }
      if (this.active) {
        if (saved || this.ignored.has(id)) continue;
        const ducked = current.map(v => Math.round(v * .25));
        try { await this.run('pactl', ['set-sink-input-volume', id, ...ducked.map(String)], { timeout: 3000 }); this.owned.set(id, { original: current, ducked }); } catch {}
      } else if (saved && unchanged) {
        try { await this.run('pactl', ['set-sink-input-volume', id, ...saved.original.map(String)], { timeout: 3000 }); this.owned.delete(id); } catch {}
      }
    }
    if (!this.active) this.ignored.clear();
    return { active: this.active, streams: this.owned.size };
  }
}
module.exports = { SpotifyDucking };
