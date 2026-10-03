/** Original realtime glass landscape. No network assets or animation runtime. */
export function createGlassScene(canvas: HTMLCanvasElement, reducedMotion = false) {
  const gl = canvas.getContext("webgl", { alpha: false, antialias: true, powerPreference: "low-power" });
  if (!gl) return () => undefined;
  const vertex = `
    attribute vec3 position;
    uniform float time; uniform float aspect; uniform vec2 pointer;
    varying vec3 world; varying vec3 normal; varying vec3 eye;
    void main(){
      float f=position.y;
      float a=position.x*.65+position.z*.48+time*.24+f*.7;
      float b=position.x*.32-position.z*.6+f;
      vec3 p=vec3(position.x,-.7+f*.27+sin(a)*.48+sin(b)*.3,position.z);
      normal=normalize(vec3(-cos(a)*.312-cos(b)*.096,1.,-cos(a)*.2304+cos(b)*.18));
      float arrival=1.-exp(-time*.55);
      vec3 origin=vec3(pointer.x*.18,1.5-arrival*.4,5.8-arrival*.8);
      vec3 forward=normalize(vec3(0.,-.1+pointer.y*.1,0.)-origin);
      vec3 right=normalize(cross(forward,vec3(0.,1.,0.))),up=cross(right,forward);
      vec3 rel=p-origin;
      float z=dot(rel,forward);
      gl_Position=vec4(dot(rel,right)*1.8/aspect,dot(rel,up)*1.8,1.01005*z-.201005,z);
      world=p;eye=origin;
    }`;
  const fragment = `precision highp float;
    varying vec3 world; varying vec3 normal; varying vec3 eye;
    void main(){
      vec3 ray=normalize(world-eye);vec3 n=normalize(normal);if(dot(n,ray)>0.)n=-n;
      vec3 light=normalize(vec3(-.6,1.,1.));
      float fresnel=pow(1.-max(dot(n,-ray),0.),3.);
      float spec=pow(max(dot(reflect(-light,n),-ray),0.),65.);
      float sheen=pow(max(dot(reflect(-normalize(vec3(1.,.4,.1)),n),-ray),0.),18.);
      vec3 color=vec3(.027,.075,.11)+vec3(.15,.32,.42)*fresnel+vec3(.6,.8,.86)*spec+vec3(.16,.34,.49)*sheen;
      color+=vec3(.07,.14,.18)*max(dot(n,light),0.);
      color=mix(color,vec3(.015,.03,.045),smoothstep(4.,13.,length(world-eye))*.8);
      gl_FragColor=vec4(color,.88);
    }`;
  function compile(type: number, source: string) {
    const shader = gl!.createShader(type)!;
    gl!.shaderSource(shader, source); gl!.compileShader(shader);
    if (!gl!.getShaderParameter(shader, gl!.COMPILE_STATUS)) { gl!.deleteShader(shader); return null; }
    return shader;
  }
  const vs = compile(gl.VERTEX_SHADER, vertex), fs = compile(gl.FRAGMENT_SHADER, fragment);
  if (!vs || !fs) { if (vs) gl.deleteShader(vs); if (fs) gl.deleteShader(fs); return () => undefined; }
  const program = gl.createProgram()!;
  gl.attachShader(program, vs); gl.attachShader(program, fs); gl.linkProgram(program);
  gl.deleteShader(vs); gl.deleteShader(fs);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) { gl.deleteProgram(program); return () => undefined; }
  gl.useProgram(program);
  // Three continuous curved sheets. Tessellation gives smooth silhouettes without ray-march noise.
  const vertices: number[] = [];
  const nx = 110, nz = 30;
  function point(x: number, z: number, layer: number) { vertices.push(-7 + x / nx * 14, layer, -1.65 + z / nz * 3.3 - layer * .6); }
  for (let layer = 0; layer < 3; layer++) {
    for (let x = 0; x < nx; x++) for (let z = 0; z < nz; z++) {
      point(x,z,layer); point(x+1,z,layer); point(x,z+1,layer);
      point(x,z+1,layer); point(x+1,z,layer); point(x+1,z+1,layer);
    }
  }
  const buffer = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
  const position = gl.getAttribLocation(program, "position"); gl.enableVertexAttribArray(position); gl.vertexAttribPointer(position, 3, gl.FLOAT, false, 0, 0);
  const aspect = gl.getUniformLocation(program,"aspect"), clock = gl.getUniformLocation(program,"time"), cursor = gl.getUniformLocation(program,"pointer");
  gl.enable(gl.DEPTH_TEST); gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);
  gl.clearColor(.015,.03,.045,1);
  let frame = 0, disposed = false, px = 0, py = 0;
  const start = performance.now();
  function draw(now: number) {
    if (disposed || gl!.isContextLost()) return;
    const bounds = canvas.getBoundingClientRect();
    const scale = Math.min(1, 1600 / Math.max(1, bounds.width));
    const width = Math.max(1, Math.round(bounds.width * scale)), height = Math.max(1, Math.round(bounds.height * scale));
    if (canvas.width !== width || canvas.height !== height) { canvas.width = width; canvas.height = height; }
    gl!.viewport(0,0,width,height); gl!.clear(gl!.COLOR_BUFFER_BIT | gl!.DEPTH_BUFFER_BIT);
    gl!.uniform1f(aspect,width/height);
    gl!.uniform1f(clock,reducedMotion ? 2 : Math.min((now-start)/1000,12)); gl!.uniform2f(cursor,px,py);
    gl!.drawArrays(gl!.TRIANGLES,0,vertices.length/3);
    if (!reducedMotion && !document.hidden) frame = requestAnimationFrame(draw);
  }
  function move(event: PointerEvent) { if (reducedMotion) return; px = event.clientX / innerWidth - .5; py = .5 - event.clientY / innerHeight; }
  function resume() { cancelAnimationFrame(frame); draw(performance.now()); }
  window.addEventListener("pointermove",move); window.addEventListener("resize",resume); document.addEventListener("visibilitychange",resume);
  draw(start);
  return () => { disposed = true; cancelAnimationFrame(frame); window.removeEventListener("pointermove",move); window.removeEventListener("resize",resume); document.removeEventListener("visibilitychange",resume); gl.deleteBuffer(buffer); gl.deleteProgram(program); };
}
