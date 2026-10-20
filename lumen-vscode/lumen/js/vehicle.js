/* vehicle.js — Craig W. Reynolds, "Steering Behaviors For Autonomous Characters" (GDC 1999), en 3D (THREE.Vector3).
   Chaque comportement RENVOIE une force de pilotage ; Vehicle.update(force) applique le « Simple Vehicle Model » :
   force = truncate(force, max_force) ; v = truncate(v + force/mass, max_speed) ; p += v.                      */
const _z = () => new THREE.Vector3(), _r = () => Math.random() * 2 - 1;
class Vehicle {
  constructor(p, o = {}) {
    this.p = p.clone(); this.v = _z(); this.maxSpeed = o.maxSpeed ?? .3; this.maxForce = o.maxForce ?? .015;
    this.mass = o.mass ?? 1; this.r = o.r ?? 1;
    this.up = new THREE.Vector3(0, 1, 0); this.side = new THREE.Vector3(1, 0, 0); this.wd = new THREE.Vector3(1, 0, 0);
  }
  static dir(q) { return q.v.lengthSq() > 1e-8 ? q.v.clone().normalize() : new THREE.Vector3(0, 0, 1); }
  get fwd() { return Vehicle.dir(this); }

  /* ---- Locomotion : modèle de véhicule simple + repère local (forward / side / up) ---- */
  update(f) {
    f.clampLength(0, this.maxForce); this.v.addScaledVector(f, 1 / this.mass); this.v.clampLength(0, this.maxSpeed); this.p.add(this.v);
    const fw = this.fwd; this.side.crossVectors(this.up, fw); if (this.side.lengthSq() < 1e-6) this.side.set(1, 0, 0);
    this.side.normalize(); this.up.crossVectors(fw, this.side).normalize();      // reconstruction du repère (sans roulis brutal)
  }

  /* ---- Seek / Flee / Arrival ---- */
  seek(t) { return t.clone().sub(this.p).setLength(this.maxSpeed).sub(this.v); }
  flee(t) { return this.p.clone().sub(t).setLength(this.maxSpeed).sub(this.v); }
  arrive(t, slow = 15) {
    const o = t.clone().sub(this.p), d = o.length(); if (d < 1e-4) return this.v.clone().negate();
    return o.multiplyScalar(Math.min(this.maxSpeed * d / slow, this.maxSpeed) / d).sub(this.v);
  }

  /* ---- Pursuit / Evasion (prédiction T ∝ distance ; T=0 si on est aligné et devant la proie) ---- */
  predict(q, c = .3) {
    let T = this.p.distanceTo(q.p) * c / Math.max(this.maxSpeed, .01), off = this.p.clone().sub(q.p).normalize();
    if (this.fwd.dot(Vehicle.dir(q)) > .9 && Vehicle.dir(q).dot(off) > .5) T = 0;
    return q.p.clone().addScaledVector(q.v, T);
  }
  pursue(q, c) { return this.seek(this.predict(q, c)); }
  evade(q, c) { return this.flee(this.predict(q, c)); }

  /* ---- Offset pursuit : passe près (à distance R) de la cible sans la percuter ---- */
  offsetPursuit(q, R = 4, c = .3) {
    const t = this.predict(q, c), d = t.clone().sub(this.p), f = this.fwd, lat = d.addScaledVector(f, -d.dot(f));
    if (lat.lengthSq() < 1e-6) lat.copy(this.up);
    return this.arrive(t.addScaledVector(lat.normalize(), -R), 8);
  }

  /* ---- Wander : marche aléatoire sur une sphère placée devant le véhicule ---- */
  wander(rate = .25) {
    this.wd.add(new THREE.Vector3(_r(), _r(), _r()).multiplyScalar(rate)).normalize();
    return this.fwd.multiplyScalar(.6).add(this.wd).setLength(this.maxForce);
  }

  /* ---- Obstacle avoidance : cylindre de vol libre devant le véhicule, obstacles = sphères {p, r} ---- */
  avoidObstacles(obs, look = 8) {
    const f = this.fwd; let best = null, bz = 1e9;
    for (const o of obs) {
      const l = o.p.clone().sub(this.p), z = l.dot(f); if (z < 0 || z > look + o.r) continue;
      const lat = l.addScaledVector(f, -z); if (lat.length() > o.r + this.r) continue;
      if (z < bz) { bz = z; best = lat; }
    }
    if (!best) return _z(); if (best.lengthSq() < 1e-6) best.copy(this.up);
    return best.negate().setLength(this.maxForce * (1.5 - Math.min(1, bz / (look + 1))));
  }

  /* ---- Path following : spine (polyligne) + rayon. Hors du tube → seek ; dedans → simple guidage le long du tube ---- */
  followPath(path, dir = 1, look = 10) {
    const fut = this.p.clone().addScaledVector(this.v, look), P = path.pts; let bd = 1e9, bp = null, bt = null;
    for (let i = 0; i < P.length - 1; i++) {
      const a = P[i], ab = P[i + 1].clone().sub(a), L = ab.length(); if (L < 1e-6) continue;
      const t = Math.min(L, Math.max(0, fut.clone().sub(a).dot(ab) / L)), q = a.clone().addScaledVector(ab, t / L), d = q.distanceTo(fut);
      if (d < bd) { bd = d; bp = q; bt = ab.divideScalar(L); }
    }
    if (bd < path.radius) return bt.multiplyScalar(dir * this.maxSpeed).sub(this.v).multiplyScalar(.5);
    return this.seek(bp.addScaledVector(bt, dir * 6));
  }

  /* ---- Containment (boîte {min,max}) : si la position future sort, seek vers l'intérieur ---- */
  contain(box, look = 8) {
    const fut = this.p.clone().addScaledVector(this.v, look), c = fut.clone().clamp(box.min, box.max);
    return c.equals(fut) ? _z() : this.seek(c);
  }

  /* ---- Flow field following : fn(position) → direction du courant ---- */
  flowField(fn) { return fn(this.p.clone().addScaledVector(this.v, 8)).setLength(this.maxSpeed).sub(this.v); }

  /* ---- Voisinage (distance + angle de vue) puis Separation / Alignment / Cohesion = Flocking (boids) ---- */
  nbr(all, r, ang = -1) {
    const f = this.fwd;
    return all.filter(o => { if (o === this) return false; const d = o.p.clone().sub(this.p), l = d.length(); return l > 0 && l < r && (ang <= -1 || d.dot(f) / l >= ang); });
  }
  separation(all, r = 3, ang = -1) {
    const s = _z(); for (const o of this.nbr(all, r, ang)) { const d = this.p.clone().sub(o.p), l = d.length(); s.addScaledVector(d, 1 / (l * l)); }
    return s.lengthSq() ? s.setLength(this.maxForce) : s;
  }
  alignment(all, r = 9, ang = -1) {
    const n = this.nbr(all, r, ang); if (!n.length) return _z(); const a = _z(); n.forEach(o => a.add(o.v));
    return a.divideScalar(n.length).sub(this.v);
  }
  cohesion(all, r = 9, ang = -1) {
    const n = this.nbr(all, r, ang); if (!n.length) return _z(); const c = _z(); n.forEach(o => c.add(o.p));
    return c.divideScalar(n.length).sub(this.p);
  }
  flock(all, o = {}) {
    const { r = 9, ang = -.3, ws = 1.5, wa = .6, wc = .5 } = o, n = v => v.lengthSq() ? v.setLength(this.maxForce) : v;   // composantes normalisées puis pondérées
    return n(this.separation(all, r * .3, ang)).multiplyScalar(ws).add(n(this.alignment(all, r, ang)).multiplyScalar(wa)).add(n(this.cohesion(all, r, ang)).multiplyScalar(wc));
  }

  /* ---- Leader following : arrival derrière le chef, dégagement latéral devant lui, separation entre suiveurs ---- */
  leaderFollow(L, off = 4, followers = []) {
    const lf = Vehicle.dir(L), rel = this.p.clone().sub(L.p), z = rel.dot(lf), lat = rel.addScaledVector(lf, -z), f = _z();
    if (z > 0 && z < off * 2 && lat.length() < (L.r || 1) + 3) f.add(lat.lengthSq() > 1e-6 ? lat.setLength(this.maxForce * 2) : this.up.clone().multiplyScalar(this.maxForce));
    return f.add(this.arrive(L.p.clone().addScaledVector(lf, -off), 10)).add(this.separation(followers, 3));
  }

  /* ---- Interpose : se placer entre deux véhicules mobiles ---- */
  interpose(a, b) {
    const T = a.p.clone().add(b.p).multiplyScalar(.5).distanceTo(this.p) / this.maxSpeed;
    return this.arrive(a.p.clone().addScaledVector(a.v, T).add(b.p.clone().addScaledVector(b.v, T)).multiplyScalar(.5), 10);
  }

  /* ---- Hide : se placer de l'autre côté d'un obstacle par rapport à la menace ---- */
  hide(th, obs) {
    let best = null, bd = 1e9;
    for (const o of obs) { const s = o.p.clone().add(o.p.clone().sub(th.p).setLength(o.r + this.r + 2)), d = s.distanceTo(this.p); if (d < bd) { bd = d; best = s; } }
    return best ? this.arrive(best, 10) : _z();
  }

  /* ---- Unaligned collision avoidance : instant et lieu du plus proche passage, on s'écarte du point prédit ---- */
  unalignedAvoid(all, min = 2.5, horizon = 60) {
    let bt = 1e9, bs = null;
    for (const o of all) {
      if (o === this) continue; const rp = o.p.clone().sub(this.p), rv = o.v.clone().sub(this.v), vv = rv.lengthSq(); if (vv < 1e-8) continue;
      const t = -rp.dot(rv) / vv; if (t <= 0 || t > horizon || t >= bt) continue;
      const c = rp.addScaledVector(rv, t); if (c.length() < min * 2) { bt = t; bs = c; }
    }
    return bs ? bs.negate().setLength(this.maxForce) : _z();
  }

  /* ---- Combiner les comportements ---- */
  // « prioritized dithering » : chaque comportement est tiré avec probabilité p ; le premier qui renvoie une force non nulle gagne.
  static prioritized(list, p = .9) { for (const fn of list) if (Math.random() < p) { const f = fn(); if (f && f.lengthSq() > 1e-9) return f; } return _z(); }
  // somme pondérée : Vehicle.blend([[force, poids], ...])
  static blend(pairs) { const s = _z(); for (const [f, w] of pairs) s.addScaledVector(f, w); return s; }
}
