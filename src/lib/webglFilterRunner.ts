// New file with a simple WebGL filter runner utility.
// This utility creates a minimal WebGL context, compiles shaders, and renders
// a source (video or canvas) onto a temporary WebGL canvas with specified
// filter uniforms. The resulting canvas can then be used to extract pixels.
// This is significantly faster than CPU-based pixel manipulation for filters.

type Uniforms = {
  // Color filters
  brightness?: number; contrast?: number; hue?: number;
  saturate?: number; grayscale?: number; sepia?: number; invert?: number;
  // Distortion effects
  bulge?: number; pinch?: number; twist?: number;
  fisheye?: number; stretch?: number; squeeze?: number;
  tunnel?: number;
  // New effects
  kaleidoscope?: number; ripple?: number; glitch?: number;
  center?: [number, number]; // Center point for distortions (default: [0.5, 0.5])
};

// Helper to map CSS filter string to WebGL uniforms object
// This is a simplified parser that only handles the filter functions
// expected in the effects list and maps them to 0-1 or degree values.
export function mapCssFilterStringToUniforms(filterString: string): Record<string, number | number[]> {
  // Default uniform values - these match neutral shader behavior
  const uniforms: Record<string, number | number[]> = {
    brightness: 1.0,
    contrast: 1.0,
    hue: 0.0, // in degrees
    saturate: 1.0,
    grayscale: 0.0,
    sepia: 0.0,
    invert: 0.0,
    bulge: 0.0,
    pinch: 0.0,
    twist: 0.0,
    fisheye: 0.0,
    stretch: 0.0, 
    squeeze: 0.0,
    tunnel: 0.0,
    kaleidoscope: 0.0,
    ripple: 0.0,
    glitch: 0.0,
    center: [0.5, 0.5]
  };

  if (filterString === 'none') {
    return uniforms;
  }

  // Check for special effect keywords that aren't standard CSS filters
  // Format: "effect(strength)" or "effect(strength,centerX,centerY)"
  const specialEffects = {
    'bulge': 'bulge',
    'pinch': 'pinch',
    'dent': 'pinch', // Alias
    'twist': 'twist',
    'twirl': 'twist', // Alias
    'fisheye': 'fisheye',
    'stretch': 'stretch',
    'squeeze': 'squeeze',
    'tunnel': 'tunnel',
    'kaleidoscope': 'kaleidoscope', // New effects
    'ripple': 'ripple',
    'glitch': 'glitch'
  };
  
  // First check for special effect keywords
  for (const [keyword, uniformName] of Object.entries(specialEffects)) {
    const regex = new RegExp(`${keyword}\\(([^)]+)\\)`, 'i');
    const match = filterString.match(regex);
    if (match) {
      const params = match[1].split(',').map(parseFloat);
      if (!isNaN(params[0])) {
        uniforms[uniformName] = params[0];
        
        // If center coordinates are provided
        if (params.length >= 3 && !isNaN(params[1]) && !isNaN(params[2])) {
          uniforms.center = [params[1], params[2]];
        }
      }
    }
  }

  // Then handle standard CSS filters
  const cssFilterRegex = /([a-z-]+)\(([^)]+)\)/g;
  let match: RegExpExecArray | null;

  while ((match = cssFilterRegex.exec(filterString))) {
    const name = match[1].trim();
    let value = parseFloat(match[2].trim());

    // Convert percentage to 0-1, keep degrees as degrees for now
    if (match[2].trim().endsWith('%')) {
      value /= 100;
    }

    switch (name) {
      case 'brightness': uniforms.brightness = value; break;
      case 'contrast': uniforms.contrast = value; break;
      case 'hue-rotate': uniforms.hue = value; break; // degrees
      case 'saturate': uniforms.saturate = value; break;
      case 'grayscale': uniforms.grayscale = value; break;
      case 'sepia': uniforms.sepia = value; break;
      case 'invert': uniforms.invert = value; break;
      default: break; // Special effect keywords handled above
    }
  }
  
  return uniforms;
}

export async function runFilter(
  source: HTMLCanvasElement | HTMLVideoElement,
  uniforms: Uniforms,
  fragmentSource: string
): Promise<HTMLCanvasElement> {
  const w = source instanceof HTMLVideoElement ? source.videoWidth  : source.width;
  const h = source instanceof HTMLVideoElement ? source.videoHeight : source.height;

  const glCanvas = document.createElement("canvas");
  glCanvas.width = w;
  glCanvas.height = h;
  const gl = glCanvas.getContext("webgl");
  if (!gl) throw new Error("WebGL unavailable");

  // ––– compile shader pair –––
  const vs = gl.createShader(gl.VERTEX_SHADER)!;
  gl.shaderSource(vs, `attribute vec2 a;varying vec2 v;void main(){v=a*0.5+0.5;gl_Position=vec4(a,0,1);}`);
  gl.compileShader(vs);

  const fs = gl.createShader(gl.FRAGMENT_SHADER)!;
  gl.shaderSource(fs, fragmentSource);
  gl.compileShader(fs);

  const prog = gl.createProgram()!;
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);

  // Check compilation and linking status *after* creation/linking
  if (!gl.getShaderParameter(vs, gl.COMPILE_STATUS)) {
    console.error('Vertex shader compilation error:', gl.getShaderInfoLog(vs));
    gl.deleteShader(vs);
    gl.deleteProgram(prog);
    throw new Error("Vertex shader compilation failed.");
  }

   if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS)) {
    console.error('Fragment shader compilation error:', gl.getShaderInfoLog(fs));
    gl.deleteShader(fs);
     gl.deleteProgram(prog);
    throw new Error("Fragment shader compilation failed.");
  }

   if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    console.error('Shader program linking error:', gl.getProgramInfoLog(prog));
    gl.deleteProgram(prog);
    throw new Error("Shader program linking failed.");
  }

  gl.useProgram(prog);

  // ––– supply quad –––
  const buf = gl.createBuffer()!;
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
      -1,-1, +1,-1, -1,+1, +1,+1,
  ]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, "a");
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

  // ––– upload texture –––
  const tex = gl.createTexture()!;
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  // Use `unpackFlipYWEBGL` to correctly orient video texture
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false); // Reset state

  // ––– push uniforms –––
  // Color filter uniforms
  const colorUniforms: Record<string, number> = {
    brightness: uniforms.brightness ?? 1.0,
    contrast: uniforms.contrast ?? 1.0,
    hue: uniforms.hue ?? 0.0, // degrees, converted in shader
    saturate: uniforms.saturate ?? 1.0,
    grayscale: uniforms.grayscale ? 1.0 : 0.0, // 0 or 1
    sepia: uniforms.sepia ? 1.0 : 0.0, // 0 or 1
    invert: uniforms.invert ? 1.0 : 0.0, // 0 or 1
  };

  // Distortion effect uniforms
  const distortUniforms: Record<string, number> = {
    bulge: uniforms.bulge ?? 0.0,
    pinch: uniforms.pinch ?? 0.0,
    twist: uniforms.twist ?? 0.0,
    fisheye: uniforms.fisheye ?? 0.0,
    stretch: uniforms.stretch ?? 0.0,
    squeeze: uniforms.squeeze ?? 0.0,
    tunnel: uniforms.tunnel ?? 0.0,
    kaleidoscope: uniforms.kaleidoscope ?? 0.0, // New effects
    ripple: uniforms.ripple ?? 0.0,
    glitch: uniforms.glitch ?? 0.0
  };

  // Set all color filter uniforms
  Object.entries(colorUniforms).forEach(([k, v]) => {
    const u = gl.getUniformLocation(prog, `u_${k}`); 
    if (u) gl.uniform1f(u, v as number);
  });

  // Set all distortion effect uniforms
  Object.entries(distortUniforms).forEach(([k, v]) => {
    const u = gl.getUniformLocation(prog, `u_${k}`);
    if (u) gl.uniform1f(u, v as number);
  });

  // Set center point for distortions
  const centerU = gl.getUniformLocation(prog, 'u_center');
  if (centerU) {
    const center = uniforms.center ?? [0.5, 0.5];
    gl.uniform2f(centerU, center[0], center[1]);
  }

  // ––– draw –––
  gl.clearColor(0, 0, 0, 0);
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.viewport(0, 0, w, h);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

  // Return the canvas containing the rendered GL output
  return glCanvas;
} 