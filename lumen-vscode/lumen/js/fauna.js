/* fauna.js — vie ambiante (n'affecte pas le gameplay). Chaque espèce utilise des comportements de vehicle.js :
   bancs décoratifs : followPath + flock + flowField + unalignedAvoid + avoidObstacles + contain (prioritized dithering)
   poissons-pilotes : offsetPursuit autour du requin + separation
   raies manta      : wander + contain + avoidObstacles ; la 2e : leaderFollow
   méduses          : wander + contain ; fuient le requin avec hide() derrière les rochers
   bulles de sources hydrothermales + chant lointain de baleine                                                      */
const Fauna = (() => {
  const V3 = THREE.Vector3, v3 = (x, y, z) => new V3(x, y, z), dm = new THREE.Object3D(), tmp = v3(0, 0, 0);
  const BOX = { min: v3(-W.x + 6, 7, -W.z + 6), max: v3(W.x - 6, 27, W.z - 6) };
  const flow = p => v3(Math.sin(p.z * .05 + U.uT.value * .2), .15 * Math.sin(p.x * .07), Math.cos(p.x * .05 + U.uT.value * .15));
  const floorPush = f => { const y = floorY(f.p.x, f.p.z) + 4; return f.p.y < y ? v3(0, (y - f.p.y) * .01, 0) : v3(0, 0, 0); };

  // ---- bancs décoratifs + poissons-pilotes (un seul InstancedMesh)
  const schools = [], all = [];
  for (let s = 0; s < 3; s++) {
    const c = v3(R(-30, 30), R(12, 20), R(-14, 14)), pts = [];
    for (let i = 0; i < 6; i++) { const a = i / 6 * 6.283; pts.push(v3(c.x + Math.cos(a) * R(18, 30), c.y + R(-3, 3), c.z + Math.sin(a) * R(10, 18))); }
    pts.push(pts[0].clone());
    const sch = { path: { pts, radius: 10 }, fish: [], tint: [[1, 1, 1], [1.3, 1.15, .7], [.8, 1, 1.3]][s] };
    for (let i = 0; i < 26; i++) {
      const f = new Vehicle(pts[0].clone().add(v3(R(-5, 5), R(-2, 2), R(-5, 5))), { maxSpeed: R(.12, .16), maxForce: .008 });
      f.v.set(R(-.05, .05), 0, R(-.05, .05)); f.sz = R(.35, .55); f.tint = sch.tint; sch.fish.push(f); all.push(f);
    }
    schools.push(sch);
  }
  const pilots = [0, 1, 2].map(i => { const f = new Vehicle(SH.p.clone().add(v3(R(-3, 3), R(-2, 2), R(-8, -3))), { maxSpeed: .5, maxForce: .02 }); f.sz = .5; f.tint = [1.4, 1.3, .6]; f.off = 3 + i * 1.2; return f; });
  all.push(...pilots);
  const N = all.length, ph = new Float32Array(N).map(() => R(0, 6.28));
  const g = body(1.2, .3, .36, 1.7, [.42, .5, .56], [.92, .94, .96]); g.setAttribute('aPhase', new THREE.InstancedBufferAttribute(ph, 1));
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .4, metalness: .3, emissive: 0x0a3a4a, emissiveIntensity: .2, side: THREE.DoubleSide }); swim(mat, 1.2, .2, 9);
  const im = new THREE.InstancedMesh(g, mat, N); im.frustumCulled = false; sc.add(im); all.forEach((f, i) => im.setColorAt(i, new THREE.Color(...f.tint)));

  // ---- raies manta (ailes qui battent, vertex shader)
  const mm = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .6, side: THREE.DoubleSide });
  mm.onBeforeCompile = s => { s.uniforms.uT = U.uT; s.vertexShader = 'uniform float uT;\n' + s.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\ntransformed.y+=sin(uT*1.6-abs(position.x)*.9)*abs(position.x)*.32;'); };
  const mantaGeo = () => { const q = new THREE.SphereGeometry(1, 24, 12); q.scale(3.4, .22, 2.1); const p = q.attributes.position, c = []; for (let i = 0; i < p.count; i++) c.push(...(p.getY(i) > 0 ? [.12, .17, .2] : [.88, .9, .9])); q.setAttribute('color', new THREE.Float32BufferAttribute(c, 3)); q.computeVertexNormals(); return q; };
  const mantas = [0, 1].map(i => {
    const m = new THREE.Group(); m.add(new THREE.Mesh(mantaGeo(), mm));
    const t = new THREE.Mesh(new THREE.ConeGeometry(.09, 4, 6), new THREE.MeshStandardMaterial({ color: 0x20282c })); t.rotation.x = -Math.PI / 2; t.position.z = -4; m.add(t);
    m.scale.setScalar(i ? .8 : 1.1); sc.add(m);
    const v = new Vehicle(v3(R(-30, 30), R(14, 22), R(-20, 20)), { maxSpeed: .11, maxForce: .003, r: 3 }); v.v.set(.05, 0, .02); v.m = m; return v;
  });

  // ---- méduses
  const jelly = [...Array(8)].map(() => {
    const gr = new THREE.Group(), bell = new THREE.Mesh(new THREE.SphereGeometry(1, 18, 10, 0, 6.283, 0, 1.7), new THREE.MeshStandardMaterial({ color: 0xb48cff, emissive: 0x6b3cff, emissiveIntensity: .8, transparent: true, opacity: .55, side: THREE.DoubleSide, roughness: .2 }));
    gr.add(bell);
    for (let i = 0; i < 6; i++) { const t = new THREE.Mesh(new THREE.CylinderGeometry(.03, .008, 3, 4), new THREE.MeshBasicMaterial({ color: 0xd8c4ff, transparent: true, opacity: .5 })), a = i / 6 * 6.283; t.position.set(Math.cos(a) * .6, -1.5, Math.sin(a) * .6); gr.add(t); }
    gr.userData.bell = bell; sc.add(gr);
    const v = new Vehicle(v3(R(-50, 50), R(10, 24), R(-28, 28)), { maxSpeed: .04, maxForce: .002, r: 1.5 }); v.g = gr; v.ph = R(0, 6); v.sz = R(.8, 1.6); return v;
  });

  // ---- bulles des sources hydrothermales
  const NB = 90, bp = new Float32Array(NB * 3), vents = [[-20, 22], [12, -24], [34, 18]].map(a => v3(a[0], floorY(a[0], a[1]), a[1]));
  const reb = (i, h) => { const v = vents[i % 3]; bp[i * 3] = v.x + R(-.6, .6); bp[i * 3 + 1] = v.y + h; bp[i * 3 + 2] = v.z + R(-.6, .6); };
  for (let i = 0; i < NB; i++) reb(i, R(0, 24));
  const bg = new THREE.BufferGeometry(); bg.setAttribute('position', new THREE.BufferAttribute(bp, 3));
  sc.add(new THREE.Points(bg, new THREE.PointsMaterial({ map: glowTex(), size: .9, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, color: 0xcff4ff, opacity: .7 })));

  // ---- chant de baleine, très lointain
  (function whale() { if (A.c && mode === 'play') { A.tone(78, 5, 'sine', .1, 52); A.tone(117, 5, 'sine', .04, 78, .3); } setTimeout(whale, R(25000, 45000)); })();

  function step() {
    schools.forEach((sch, k) => {
      const other = schools[(k + 1) % schools.length].fish;
      for (const f of sch.fish) {
        const F = Vehicle.prioritized([() => f.avoidObstacles(rocks, 9), () => f.contain(BOX)], .9).multiplyScalar(3);
        F.add(f.flock(sch.fish)).add(f.followPath(sch.path, 1, 10)).add(f.flowField(flow).multiplyScalar(.4)).add(f.unalignedAvoid(other, 3)).add(floorPush(f)); f.update(F);
      }
    });
    for (const f of pilots) f.update(Vehicle.prioritized([() => f.avoidObstacles(rocks, 8)]).multiplyScalar(2).add(f.offsetPursuit(SH, f.off, .2)).add(f.separation(pilots, 3)));
    const m0 = mantas[0], m1 = mantas[1];
    m0.update(Vehicle.prioritized([() => m0.avoidObstacles(rocks, 14), () => m0.contain(BOX, 14)], .95).add(m0.wander(.15)).add(floorPush(m0).multiplyScalar(2)));
    m1.update(Vehicle.prioritized([() => m1.avoidObstacles(rocks, 14)]).add(m1.leaderFollow(m0, 8, [])).add(floorPush(m1).multiplyScalar(2)));
    for (const j of jelly) {
      const F = Vehicle.prioritized([() => j.avoidObstacles(rocks, 6), () => j.contain(BOX)]).multiplyScalar(2).add(j.wander(.1)).add(floorPush(j));
      if (SH.p.distanceTo(j.p) < 40) F.add(j.hide(SH, rocks).multiplyScalar(2)); j.update(F);
    }
  }
  function render(tt) {
    all.forEach((f, i) => { dm.position.copy(f.p); tmp.copy(f.p).add(f.v); dm.lookAt(tmp); dm.scale.setScalar(f.sz); dm.updateMatrix(); im.setMatrixAt(i, dm.matrix); });
    im.instanceMatrix.needsUpdate = true;
    for (const q of mantas) { q.m.position.copy(q.p); tmp.copy(q.p).add(q.v); q.m.lookAt(tmp); }
    for (const j of jelly) {
      const p = 1 + .12 * Math.sin(tt * 2 + j.ph); j.g.position.set(j.p.x, j.p.y + Math.sin(tt * 1.2 + j.ph) * .6, j.p.z);
      j.g.scale.setScalar(j.sz); j.g.userData.bell.scale.set(p, 1.1 / p, p); j.g.rotation.z = Math.sin(tt * .7 + j.ph) * .08;
    }
    for (let i = 0; i < NB; i++) { bp[i * 3 + 1] += .05 + (i % 5) * .01; bp[i * 3] += Math.sin(tt * 2 + i) * .008; if (bp[i * 3 + 1] > 28) reb(i, 0); }
    bg.attributes.position.needsUpdate = true;
  }
  function recenter() {
    const c = nSw ? cs : beacon; BOX.min.set(c.x - 60, Math.max(8, floorY(c.x, c.z) + 4), c.z - 35); BOX.max.set(c.x + 60, 36, c.z + 35);
    schools.forEach(s => { const m = s.fish[0].p; if (m.distanceTo(c) > 120) { const a = R(0, 6.28), d = R(60, 90), t = v3(c.x + Math.cos(a) * d, R(14, 26), c.z + Math.sin(a) * d), dl = t.sub(m); s.path.pts.forEach(p => p.add(dl)); s.fish.forEach(f => f.p.add(dl)); } });
    for (const q of mantas.concat(jelly)) if (q.p.distanceTo(c) > 130) { const a = R(0, 6.28), d = R(70, 100); q.p.set(c.x + Math.cos(a) * d, R(16, 26), c.z + Math.sin(a) * d); }
    vents.forEach(v => { if (v.distanceTo(c) > 100) { const a = R(0, 6.28), d = R(30, 90), x = c.x + Math.cos(a) * d, z = c.z + Math.sin(a) * d; v.set(x, floorY(x, z), z); } });
  }
  let acc = 0;
  return { update(dt, tt) { recenter(); acc += dt * 60; let n = 0; while (acc >= 1 && n < 4) { step(); acc--; n++; } if (n >= 4) acc = 0; render(tt); } };
})();
