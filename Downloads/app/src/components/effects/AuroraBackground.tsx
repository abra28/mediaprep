import { useEffect, useRef } from "react";

const VERTEX_SHADER = `
attribute vec2 position;
void main() {
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

const FRAGMENT_SHADER = `
precision highp float;
uniform float u_time;
uniform vec2 u_res;
uniform vec2 u_mouse;

float hash(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

float vnoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
    mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x),
    f.y
  );
}

float auroraLayer(vec2 uv, float t, float speed, float freq, float amp, vec2 dir, float xWarp) {
  vec2 p = uv;
  p.y += t * speed;
  float displacement = sin(p.x * freq + t * 0.5) * amp + sin(p.x * freq * 2.3 + t * 0.7) * amp * 0.5;
  p.x += displacement + xWarp;
  float h = sin(dot(p, dir)) * 0.5 + 0.5;
  h *= vnoise(p * 3.0 + t * 0.1);
  float edge = smoothstep(0.0, 0.3, h) * (1.0 - smoothstep(0.5, 0.9, h));
  return edge;
}

vec3 auroraColor(float height) {
  vec3 deepPurple = vec3(0.149, 0.110, 0.459);
  vec3 midPurple = vec3(0.290, 0.196, 0.627);
  vec3 violet = vec3(0.631, 0.357, 0.906);
  vec3 white = vec3(0.988, 0.984, 0.976);
  vec3 c1 = mix(deepPurple, midPurple, smoothstep(0.0, 0.3, height));
  vec3 c2 = mix(midPurple, violet, smoothstep(0.3, 0.6, height));
  vec3 c3 = mix(violet, white, smoothstep(0.6, 0.9, height));
  vec3 color = mix(c1, c2, smoothstep(0.1, 0.4, height));
  color = mix(color, c3, smoothstep(0.5, 0.8, height));
  color += vec3(0.15) * smoothstep(0.7, 1.0, height);
  return color;
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_res;
  vec2 uvAspect = vec2(uv.x * (u_res.x / u_res.y), uv.y);
  vec2 mouseOffset = vec2(0.0);
  if (u_mouse.x > 0.0) {
    mouseOffset = (u_mouse / u_res - 0.5) * 0.2;
  }
  float t = u_time * 0.15;
  float edge1 = auroraLayer(uvAspect, t, 0.04, 3.0, 0.2, vec2(1.0, 2.5), mouseOffset.x * 0.5);
  vec3 color1 = auroraColor(edge1) * edge1;
  float edge2 = auroraLayer(uvAspect, t * 1.1 + 1.0, 0.03, 2.5, 0.25, vec2(1.2, 2.0), -mouseOffset.x * 0.3);
  vec3 color2 = auroraColor(edge2 * 0.8) * edge2 * 0.7;
  vec3 col = color1 + color2;
  if (max(edge1, edge2) < 0.1) {
    float stars = hash(gl_FragCoord.xy);
    col += vec3(0.15) * smoothstep(0.995, 1.0, stars);
  }
  float vig = 1.0 - dot(uv - 0.5, uv - 0.5) * 1.5;
  col *= max(vig, 0.0);
  col = pow(col, vec3(1.0 / 2.2));
  gl_FragColor = vec4(col, 1.0);
}
`;

function resizeCanvasToDisplaySize(canvas: HTMLCanvasElement) {
  const dpr = window.devicePixelRatio || 1;
  const w = Math.round(canvas.clientWidth * dpr);
  const h = Math.round(canvas.clientHeight * dpr);
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
}

export default function AuroraBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const glCtx = canvas.getContext("webgl", { alpha: true });
    if (!glCtx) return;
    const gl = glCtx;

    const vertShader = gl.createShader(gl.VERTEX_SHADER)!;
    gl.shaderSource(vertShader, VERTEX_SHADER);
    gl.compileShader(vertShader);

    const fragShader = gl.createShader(gl.FRAGMENT_SHADER)!;
    gl.shaderSource(fragShader, FRAGMENT_SHADER);
    gl.compileShader(fragShader);

    const program = gl.createProgram()!;
    gl.attachShader(program, vertShader);
    gl.attachShader(program, fragShader);
    gl.linkProgram(program);
    gl.useProgram(program);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);

    const posLoc = gl.getAttribLocation(program, "position");
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

    const uTime = gl.getUniformLocation(program, "u_time");
    const uRes = gl.getUniformLocation(program, "u_res");
    const uMouse = gl.getUniformLocation(program, "u_mouse");

    let mouseX = 0;
    let mouseY = 0;

    const onMouseMove = (e: MouseEvent) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
    };
    window.addEventListener("mousemove", onMouseMove);

    const startTime = performance.now();
    let rafId: number;

    function render() {
      const time = (performance.now() - startTime) * 0.001;
      resizeCanvasToDisplaySize(canvasRef.current!);
      const c = canvasRef.current!;
      gl.viewport(0, 0, c.width, c.height);
      gl.uniform1f(uTime, time);
      gl.uniform2f(uRes, c.width, c.height);
      gl.uniform2f(uMouse, mouseX, c.height - mouseY);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      rafId = requestAnimationFrame(render);
    }

    rafId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("mousemove", onMouseMove);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        zIndex: 0,
      }}
    />
  );
}
