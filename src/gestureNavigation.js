import { HandTracking } from './handTracking.js';

// Intentional holds and release-to-rearm keep one pose from repeatedly
// activating controls. Directions match the mirrored camera preview.
export class GestureNavigation {
  constructor(video, onGesture = () => {}, onStatus = () => {}) {
    this.video = video;
    this.onGesture = onGesture;
    this.tracker = new HandTracking(video, (hand, now) => this._consume(hand, now), (status, message) => {
      this.status = this.enabled ? status : 'off';
      onStatus(status, message);
    });
    this.stream = null;
    this.enabled = false;
    this.lastGestureAt = 0;
    this.samples = [];
    this.openSince = 0;
    this.pinchSince = 0;
    this.motionArmed = true; this.lastPose = '';
    this.latched = false;
    this.absentSince = 0;
    this.lastSampleAt = 0;
    this.status = 'off';
    this.lastHandAt = 0;
    this.hand = null;
  }

  init() { return this.tracker.init(); }

  setEnabled(enabled) {
    this.enabled = Boolean(enabled);
    this.hand = null;
    this.tracker.setEnabled(this.enabled);
    this._reset(); this.latched = false; this.absentSince = 0; this.lastSampleAt = 0;
    this.status = this.enabled ? this.tracker.ready ? 'ready' : 'loading' : 'off';
  }

  update(now = performance.now()) {
    if (this.stream !== this.video.srcObject) {
      this.hand = null;
      this.stream = this.video.srcObject;
      this._reset(); this.latched = false; this.absentSince = 0; this.lastSampleAt = 0;
      if (this.enabled && this.tracker.ready) this.status = 'searching';
    }
    if (!this.enabled || !this.stream || this.stream.active === false || this.video.readyState < 2) {
      this.hand = null;
      if (!this.enabled) this.status = 'off';
      else if (this.status !== 'unavailable') this.status = 'camera-off';
      this._reset(); this.latched = false; this.absentSince = 0; this.lastSampleAt = 0;
    }
    // Most of the time nobody is gesturing. Look ~7 times a second until a hand
    // is seen, then at the full rate for as long as it stays; each camera bitmap
    // is several ms of main-thread work on a small PC.
    this.tracker.interval = now - this.lastHandAt < 1500 ? 75 : 140;
    this.tracker.update(now);
  }

  _consume(hand, now) {
    if (!this.enabled || !this.video.srcObject || this.video.srcObject.active === false || this.video.srcObject !== this.stream || this.video.readyState < 2) return;
    this.hand = hand;
    if (this.lastSampleAt && now - this.lastSampleAt > 400) this._reset();
    this.lastSampleAt = now;
    if (!hand) {
      if (!this.absentSince) this.absentSince = now;
      if (now - this.absentSince >= 180) this._reset();
      this.status = 'searching'; return;
    }
    this.absentSince = 0; this.lastHandAt = now; this.status = 'tracking'; this._interpret(hand, now);
  }

  destroy() { this.enabled = false; this.tracker.destroy(); this._reset(); this.latched = false; this.status = 'off'; }

  _reset() {
    this.samples = [];
    this.openSince = 0;
    this.pinchSince = 0;
    this.motionArmed = true; this.lastPose = '';
    this.latched = false;
  }

  _interpret(hand, now) {
    if (hand.length < 21) { this._reset(); return; }
    const aspect = this.video.videoWidth / Math.max(1, this.video.videoHeight);
    const measure = (a, b) => Math.hypot((a.x - b.x) * aspect, a.y - b.y);
    const palmWidth = measure(hand[5], hand[17]);
    if (palmWidth < .025) { this._reset(); return; }
    const extended = [8, 12, 16, 20].filter((tip) =>
      measure(hand[tip], hand[0]) > measure(hand[tip - 2], hand[0]) * 1.12
      && measure(hand[tip], hand[tip - 3]) > measure(hand[tip - 2], hand[tip - 3]) * 1.25
    ).length;
    const pinch = extended >= 2 && measure(hand[4], hand[8]) < palmWidth * .42;
    const open = extended >= 3 && !pinch;
    if (!pinch && !open) { this._reset(); return; }
    if (pinch) {
      if (this.lastPose !== 'pinch') { this.pinchSince = 0; this.latched = false; }
      this.lastPose = 'pinch';
      if (this.latched || now - this.lastGestureAt < 450) return;
      this.openSince = 0;
      this.samples = [];
      if (!this.pinchSince) this.pinchSince = now;
      if (now - this.pinchSince >= 220) this._emit('pinch', now);
      return;
    }
    if (this.lastPose === 'pinch') { this.samples = []; this.motionArmed = true; }
    this.lastPose = 'open'; this.pinchSince = 0;
    const point = { x: 1 - (hand[0].x + hand[9].x) / 2, y: (hand[0].y + hand[9].y) / 2, at: now };
    if (!this.openSince) this.openSince = now;
    this.samples.push(point);
    this.samples = this.samples.filter((sample) => now - sample.at < 550);
    const first = this.samples[0];
    if (!this.motionArmed) {
      const recent = this.samples.filter(sample => now - sample.at <= 190);
      const settled = recent.length >= 2 && now - recent[0].at >= 130 && recent.every(sample => Math.hypot(sample.x-point.x,sample.y-point.y)<.025);
      if (settled) { this.motionArmed = true; this.samples = [point]; }
      return;
    }
    if (now - this.lastGestureAt < 450) return;
    const dx = point.x - first.x;
    const dy = point.y - first.y;
    // The landscape camera is heavily cropped on the portrait TV: .14 of its
    // full width required an oversized sweep across the visible mirror.
    if (now - first.at >= 75 && Math.abs(dx) > .09 && Math.abs(dx) > Math.abs(dy) * 1.4) {
      this._emit(dx > 0 ? 'swipe-right' : 'swipe-left', now);
    } else if (now - first.at >= 75 && Math.abs(dy) > .1 && Math.abs(dy) > Math.abs(dx) * 1.4) {
      this._emit(dy > 0 ? 'swipe-down' : 'swipe-up', now);
    } else if (!this.latched && now - this.openSince >= 500) {
      // A palm must be held still; a slow swipe must not be read as Stop.
      const spread = Math.max(...this.samples.map((sample) => Math.hypot(sample.x - point.x, sample.y - point.y)));
      if (spread < .05) this._emit('palm', now);
    }
  }

  _emit(type, now) {
    this.lastGestureType = type;
    this.lastGestureAt = now;
    const pose = this.lastPose;
    this._reset();
    this.lastPose = pose; this.motionArmed = type === 'palm';
    this.latched = true;
    this.onGesture(type);
  }
}
