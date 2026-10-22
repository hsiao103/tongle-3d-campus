/* ===== 像素風：低解析像素化＋色板量化＋輪廓線＋像素介面（內部沿用 DQ 變數名） ===== */
const DQ = { on: false, k: 2.5, rt: null, quad: null, cam: null, mat: null };
{
  DQ.cam = new T.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  DQ.mat = new T.ShaderMaterial({
    uniforms: { tex: { value: null }, px: { value: new T.Vector2(1 / 400, 1 / 300) }, lv: { value: 6.0 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
    fragmentShader: [
      'uniform sampler2D tex; uniform vec2 px; uniform float lv; varying vec2 vUv;',
      'float b2(vec2 p){ return mod(2.0*p.x + 3.0*p.y, 4.0); }',
      'float bayer(vec2 p){ vec2 m = mod(floor(p), 4.0); return (4.0*b2(mod(m,2.0)) + b2(floor(m/2.0))) / 16.0; }',
      'float lum(vec3 c){ return dot(c, vec3(0.299, 0.587, 0.114)); }',
      'void main(){',
      '  vec2 uv = (floor(vUv / px) + 0.5) * px; vec3 c = texture2D(tex, uv).rgb;',
      '  float l0 = lum(c), e = 0.0;',
      '  e = max(e, abs(l0 - lum(texture2D(tex, uv + vec2(px.x, 0.0)).rgb)));',
      '  e = max(e, abs(l0 - lum(texture2D(tex, uv + vec2(0.0, px.y)).rgb)));',
      '  e = max(e, abs(l0 - lum(texture2D(tex, uv - vec2(px.x, 0.0)).rgb)));',
      '  e = max(e, abs(l0 - lum(texture2D(tex, uv - vec2(0.0, px.y)).rgb)));',
      '  c = mix(vec3(l0), c, 1.28); c = (c - 0.5) * 1.1 + 0.5;',
      '  float t = bayer(floor(uv / px)) - 0.5; c += t * (0.55 / lv);',
      '  c = floor(c * lv + 0.5) / lv;',
      '  c *= 1.0 - 0.38 * smoothstep(0.12, 0.3, e);',
      '  gl_FragColor = vec4(c, 1.0); }'
    ].join('\n'),
    depthTest: false, depthWrite: false
  });
  DQ.quad = new T.Mesh(new T.PlaneGeometry(2, 2), DQ.mat); DQ.quad.frustumCulled = false;
  DQ.scene = new T.Scene(); DQ.scene.add(DQ.quad);
}
function dqResize() {
  if (!DQ.on) return;
  const w = Math.max(2, Math.round(stage.clientWidth / DQ.k)), h = Math.max(2, Math.round(stage.clientHeight / DQ.k));
  if (!DQ.rt || DQ.rt.width !== w || DQ.rt.height !== h) {
    if (DQ.rt) DQ.rt.dispose();
    DQ.rt = new T.WebGLRenderTarget(w, h, { minFilter: T.NearestFilter, magFilter: T.NearestFilter, depthBuffer: true, stencilBuffer: false });
    DQ.rt.texture.generateMipmaps = false;
    DQ.mat.uniforms.tex.value = DQ.rt.texture; DQ.mat.uniforms.px.value.set(1 / w, 1 / h);
  }
}
DQ.depthMat = new T.MeshBasicMaterial({ colorWrite: false });
DQ.sprites = []; DQ.trans = []; DQ.hide = [];
function dqCollect() {
  DQ.sprites = []; DQ.trans = [];
  scene.traverse(o => {
    if (o.isSprite && o.userData && o.userData.text !== undefined) { o.layers.set(1); DQ.sprites.push(o); }
    else if (o.isMesh && o.material && !Array.isArray(o.material) && (o.material.transparent || o.material.opacity < 1)) DQ.trans.push(o);
  });
}
function dqRender() {
  if (!DQ.on && !INK.on) { camera.layers.enableAll(); renderer.render(scene, camera); return; }
  let rt, sc;
  if (DQ.on) { dqResize(); rt = DQ.rt; sc = DQ.scene; }
  else { inkResize(); rt = INK.rt; sc = INK.scene; INK.mat.uniforms.near.value = camera.near; INK.mat.uniforms.far.value = camera.far; }
  camera.layers.set(0);
  renderer.setRenderTarget(rt); renderer.render(scene, camera);            // 1) 世界（像素風為低解析；動漫線稿為原解析度，並留下深度）
  renderer.setRenderTarget(null); renderer.render(sc, DQ.cam);             // 2) 後處理（像素色板／賽璐珞＋墨線）
  const keep = DQ.trans.map(o => o.visible); DQ.trans.forEach(o => { o.visible = false; });
  const keepH = DQ.hide.map(o => o.visible); DQ.hide.forEach(o => { o.visible = false; });
  const bg = scene.background; scene.background = null;
  renderer.autoClear = false; renderer.shadowMap.autoUpdate = false; scene.overrideMaterial = DQ.depthMat;
  renderer.render(scene, camera);                                           // 3) 全解析深度（讓房名被牆擋住）
  scene.overrideMaterial = null; camera.layers.set(1);
  renderer.render(scene, camera);                                           // 4) 全解析房名標籤
  scene.background = bg; camera.layers.enableAll(); renderer.autoClear = true; renderer.shadowMap.autoUpdate = true;
  DQ.trans.forEach((o, i) => { o.visible = keep[i]; }); DQ.hide.forEach((o, i) => { o.visible = keepH[i]; });
}
// 房名標籤重畫（像素風米色框 / 還原）
function dqRelabelAll() {
  scene.traverse(o => { if (o.isSprite && o.userData && o.userData.text !== undefined && o.material.map) {
    const t = o.userData.text; o.material.map.dispose(); o.material.map = makeLabelTex(t, t === '（待補）' ? '#f3efe2' : (o.userData.bg || '#fff4e0'), o.userData.fg); o.material.needsUpdate = true; } });
}
// 對話框（逐字顯示）
let dqTyp = null, dqHide = null, dqLast = '';
function dqSay(msg) {
  const el = document.getElementById('dqd'); if (!el) return; clearInterval(dqTyp); clearTimeout(dqHide);
  el.style.display = 'block'; let i = 0; el.textContent = '';
  dqTyp = setInterval(() => { i++; el.textContent = msg.slice(0, i) + (i < msg.length ? '' : ' ▼'); if (i >= msg.length) clearInterval(dqTyp); }, 55);
  dqHide = setTimeout(() => { el.style.display = 'none'; }, 4500 + msg.length * 55);
}
setInterval(() => {
  if (!DQ.on) return; const w = document.getElementById('where'); if (!w) return;
  const s = w.textContent.split(/ · | ｜/)[0].trim();
  if (s !== dqLast) { dqLast = s; if (s && s !== '戶外' && s !== '鳥瞰模式') dqSay('來到「' + s + '」了。'); }
}, 400);
function setDQ(on) {
  if (on && INK.on) setInk(false);
  DQ.on = on; document.body.classList.toggle('dq', on);
  const b = document.getElementById('bDQ'); if (b) b.classList.toggle('on', on); if (typeof syncStd === 'function') syncStd();
  if (!on && DQ.rt) { DQ.rt.dispose(); DQ.rt = null; }
  const d = document.getElementById('dqd'); if (d && !on) d.style.display = 'none';
  dqCollect(); dqRelabelAll(); dqLast = '';
  if (on && document.fonts && document.fonts.ready) document.fonts.ready.then(() => { if (DQ.on) dqRelabelAll(); });
  try { localStorage.setItem('tl3d_dq', on ? '1' : '0'); } catch (e) {}
}

/* ===== 動漫線稿：賽璐珞分層上色＋深度／明度墨線（與像素風擇一） ===== */
const INK = { on: false, rt: null, scene: null, mat: null, depth: false };
{
  INK.depth = !!(renderer.capabilities.isWebGL2 || renderer.extensions.get('WEBGL_depth_texture'));
  INK.mat = new T.ShaderMaterial({
    uniforms: { tex: { value: null }, dep: { value: null }, px: { value: new T.Vector2(1 / 800, 1 / 600) }, near: { value: 0.1 }, far: { value: 1400 }, lw: { value: 1.2 }, useDep: { value: INK.depth ? 1 : 0 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
    fragmentShader: [
      'uniform sampler2D tex, dep; uniform vec2 px; uniform float near, far, lw, useDep; varying vec2 vUv;',
      'float lum(vec3 c){ return dot(c, vec3(0.299, 0.587, 0.114)); }',
      'float lz(vec2 uv){ float z = texture2D(dep, uv).x * 2.0 - 1.0; return 2.0 * near * far / (far + near - z * (far - near)); }',
      'void main(){',
      '  vec3 c = texture2D(tex, vUv).rgb; float l0 = lum(c); vec2 o = px * lw, ox = vec2(o.x, 0.0), oy = vec2(0.0, o.y);',
      '  float e = max(max(abs(l0 - lum(texture2D(tex, vUv + ox).rgb)), abs(l0 - lum(texture2D(tex, vUv - ox).rgb))), max(abs(l0 - lum(texture2D(tex, vUv + oy).rgb)), abs(l0 - lum(texture2D(tex, vUv - oy).rgb))));',
      '  float a = smoothstep(0.11, 0.24, e);',
      '  if (useDep > 0.5) {',
      '    vec2 d = o * 1.3; float z0 = lz(vUv), zx = lz(vUv + vec2(d.x, 0.0)) + lz(vUv - vec2(d.x, 0.0)) - 2.0 * z0, zy = lz(vUv + vec2(0.0, d.y)) + lz(vUv - vec2(0.0, d.y)) - 2.0 * z0;',
      '    a = max(a, smoothstep(0.035, 0.09, (abs(zx) + abs(zy)) / max(z0, 0.3)));',
      '  }',
      '  float B = 4.0, x = l0 * B, lq = (floor(x) + smoothstep(0.42, 0.58, fract(x))) / B;',
      '  vec3 base = c * clamp(lq / max(l0, 0.03), 0.0, 2.4);',
      '  base = mix(vec3(lum(base)), base, 1.28); base = clamp((base - 0.5) * 1.06 + 0.5, 0.0, 1.0);',
      '  gl_FragColor = vec4(mix(base, vec3(0.10, 0.07, 0.13), clamp(a, 0.0, 1.0) * 0.94), 1.0); }'
    ].join('\n'),
    depthTest: false, depthWrite: false
  });
  const q = new T.Mesh(new T.PlaneGeometry(2, 2), INK.mat); q.frustumCulled = false;
  INK.scene = new T.Scene(); INK.scene.add(q);
}
function inkResize() {
  if (!INK.on) return;
  const sz = renderer.getDrawingBufferSize(new T.Vector2()), w = Math.max(2, sz.x), h = Math.max(2, sz.y);
  if (!INK.rt || INK.rt.width !== w || INK.rt.height !== h) {
    inkFree();
    const o = { minFilter: T.LinearFilter, magFilter: T.LinearFilter, depthBuffer: true, stencilBuffer: false };
    if (INK.depth) { const dt = new T.DepthTexture(w, h); dt.type = T.UnsignedIntType; o.depthTexture = dt; }
    INK.rt = new T.WebGLRenderTarget(w, h, o); INK.rt.texture.generateMipmaps = false;
    INK.mat.uniforms.tex.value = INK.rt.texture; INK.mat.uniforms.dep.value = INK.rt.depthTexture || null;
    INK.mat.uniforms.px.value.set(1 / w, 1 / h); INK.mat.uniforms.lw.value = Math.max(1, Math.min(3, h / 720));
  }
}
function inkFree() { if (INK.rt) { if (INK.rt.depthTexture) INK.rt.depthTexture.dispose(); INK.rt.dispose(); INK.rt = null; } }
function setInk(on) {
  if (on && DQ.on) setDQ(false);
  INK.on = on; const b = document.getElementById('bInk'); if (b) b.classList.toggle('on', on); if (typeof syncStd === 'function') syncStd();
  if (!on) inkFree();
  dqCollect(); dqRelabelAll();
  try { localStorage.setItem('tl3d_ink', on ? '1' : '0'); } catch (e) {}
}
