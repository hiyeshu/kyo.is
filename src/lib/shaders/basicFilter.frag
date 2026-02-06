// fragment shader for image filters and distortion effects
precision mediump float;
varying vec2 v;
uniform sampler2D u_image;

// Color filters
uniform float u_brightness;
uniform float u_contrast;
uniform float u_saturate;
uniform float u_hue;
uniform float u_grayscale;
uniform float u_sepia;
uniform float u_invert;

// Distortion effects
uniform float u_bulge;
uniform float u_pinch;
uniform float u_twist;
uniform float u_fisheye;
uniform float u_stretch;
uniform float u_squeeze;
uniform float u_tunnel;
// New effect uniforms
uniform float u_kaleidoscope;
uniform float u_ripple;
uniform float u_glitch;
uniform vec2 u_center; // Default center point for distortions (0.5, 0.5)

// from: https://gist.github.com/mjackson/5311256
vec3 rgb2hsl(vec3 c){
  float maxc=max(max(c.r,c.g),c.b),minc=min(min(c.r,c.g),c.b);
  float h=0., s=0., l=(maxc+minc)*0.5;
  if(maxc!=minc){
    float d=maxc-minc;
    s=l>0.5?d/(2.-maxc-minc):d/(maxc+minc);
    if(maxc==c.r)      h=(c.g-c.b)/d + (c.g<c.b?6.:0.);
    else if(maxc==c.g) h=(c.b-c.r)/d + 2.;
    else               h=(c.r-c.g)/d + 4.;
    h/=6.;
  }
  return vec3(h,s,l);
}

vec3 hsl2rgb(vec3 hsl){
  float h=hsl.x,s=hsl.y,l=hsl.z;
  float q=l<.5?l*(1.+s):l+s-l*s;
  float p=2.*l-q;
  float r=abs(mod(h*6.+6.,6.)-3.)-1.;
  float g=abs(mod(h*6.+4.,6.)-3.)-1.;
  float b=abs(mod(h*6.+2.,6.)-3.)-1.;
  r=clamp(r,0.,1.); g=clamp(g,0.,1.); b=clamp(b,0.,1.);
  r=r*r*(3.-2.*r); g=g*g*(3.-2.*g); b=b*b*(3.-2.*b);
  return mix(vec3(p),vec3(q),vec3(r,g,b));
}

// Distortion functions
vec2 bulge(vec2 uv, vec2 center, float strength) {
  // Move to center coordinate system
  vec2 delta = uv - center;
  float dist = length(delta);
  
  // Create a stronger, more localized bulge that fades towards the edges
  // factor is highest (1) at the center and 0 at radius 1
  float factor = 1.0 - dist;
  factor = clamp(factor, 0.0, 1.0);
  
  // Square the factor for smoother fall-off, then scale by strength
  float scale = 1.0 + strength * factor * factor;
  delta *= scale;
  
  // Return to original coordinate system
  return center + delta;
}

vec2 pinch(vec2 uv, vec2 center, float strength) {
  // Move to center coordinate system
  vec2 delta = uv - center;
  float dist = length(delta);
  
  // Apply pinch formula (opposite of bulge)
  float f = 1.0 - dist * strength;
  delta *= f;
  
  // Return to original coordinate system
  return center + delta;
}

vec2 twist(vec2 uv, vec2 center, float strength) {
  // Move to center coordinate system
  vec2 delta = uv - center;
  float dist = length(delta);
  
  // Apply twist formula - rotate based on distance
  float angle = strength * dist;
  float sinAngle = sin(angle);
  float cosAngle = cos(angle);
  
  // Rotation matrix
  delta = vec2(
    delta.x * cosAngle - delta.y * sinAngle,
    delta.x * sinAngle + delta.y * cosAngle
  );
  
  // Return to original coordinate system
  return center + delta;
}

vec2 fisheye(vec2 uv, vec2 center, float strength) {
  // Move to center coordinate system
  vec2 delta = uv - center;
  float dist = length(delta);
  
  // Apply fisheye formula
  float r = pow(dist, 0.5) * strength;
  float theta = atan(delta.y, delta.x);
  
  // Convert back to Cartesian
  delta = r * vec2(cos(theta), sin(theta));
  
  // Return to original coordinate system
  return center + delta;
}

vec2 stretch(vec2 uv, vec2 center, float strength) {
  // Horizontal stretch
  vec2 delta = uv - center;
  delta.x *= 1.0 + strength;
  return center + delta;
}

vec2 squeeze(vec2 uv, vec2 center, float strength) {
  // Vertical stretch/horizontal squeeze
  vec2 delta = uv - center;
  delta.y *= 1.0 + strength;
  delta.x /= 1.0 + strength * 0.5;
  return center + delta;
}

// Tunnel / spiral effect – angle increases with radius creating a vortex
vec2 tunnel(vec2 uv, vec2 center, float strength) {
  vec2 delta = uv - center;
  float r = length(delta);
  float angle = strength * r * 6.28318; // 2π * strength * r
  float sinA = sin(angle);
  float cosA = cos(angle);
  delta = vec2(
    delta.x * cosA - delta.y * sinA,
    delta.x * sinA + delta.y * cosA
  );
  return center + delta;
}

// Kaleidoscope effect - creates mirror reflections in a circular pattern
vec2 kaleidoscope(vec2 uv, vec2 center, float segments) {
  if (segments <= 0.0) return uv;
  
  // Convert to polar coordinates
  vec2 delta = uv - center;
  float radius = length(delta);
  float angle = atan(delta.y, delta.x);
  
  // Calculate the segment angle
  float segmentAngle = 3.14159 * 2.0 / segments;
  
  // Normalize the angle to a segment
  angle = mod(angle, segmentAngle);
  
  // Mirror within the segment
  if (mod(floor(angle / segmentAngle) + 1.0, 2.0) >= 1.0) {
    angle = segmentAngle - angle;
  }
  
  // Convert back to Cartesian coordinates
  return center + radius * vec2(cos(angle), sin(angle));
}

// Ripple effect - creates water-like rippling distortion
vec2 ripple(vec2 uv, vec2 center, float strength) {
  vec2 delta = uv - center;
  float dist = length(delta);
  
  // Create concentric ripples
  float phase = dist * 50.0;
  float offset = sin(phase) * strength * 0.01;
  
  // Apply offset along the direction from center
  return uv + normalize(delta) * offset;
}

// Glitch effect - creates digital distortion with RGB shift
vec2 glitch(vec2 uv, float strength) {
  if (strength <= 0.0) return uv;
  
  // Create some random values based on uv position
  float lineJitter = 0.0;
  
  // Only apply to certain lines for a scanline effect
  if (mod(floor(uv.y * 50.0), 5.0) == 0.0) {
    // Random horizontal shifts on specific lines
    lineJitter = (sin(uv.y * 2053.0) * 0.5 + 0.5) * strength * 0.05;
  }
  
  // Vertical block noise - larger chunks that shift left/right
  float blockJitter = 0.0;
  float blockThreshold = 0.9 - strength * 0.2;
  if (fract(sin(floor(uv.y * 10.0) * 4000.0)) > blockThreshold) {
    blockJitter = (fract(sin(floor(uv.y * 12.0) * 5432.0)) - 0.5) * strength * 0.1;
  }
  
  return uv + vec2(lineJitter + blockJitter, 0.0);
}

void main() {
  // Apply distortion effects to get sampling coordinates
  vec2 uv = v;
  
  // Start with default coordinates
  vec2 distortedUV = uv;
  
  // Apply distortion effects if any are active
  if (u_bulge != 0.0) {
    distortedUV = bulge(distortedUV, u_center, u_bulge);
  }
  
  if (u_pinch != 0.0) {
    distortedUV = pinch(distortedUV, u_center, u_pinch);
  }
  
  if (u_twist != 0.0) {
    distortedUV = twist(distortedUV, u_center, u_twist);
  }
  
  if (u_fisheye != 0.0) {
    distortedUV = fisheye(distortedUV, u_center, u_fisheye);
  }
  
  if (u_stretch != 0.0) {
    distortedUV = stretch(distortedUV, u_center, u_stretch);
  }
  
  if (u_squeeze != 0.0) {
    distortedUV = squeeze(distortedUV, u_center, u_squeeze);
  }
  
  if (u_tunnel != 0.0) {
    distortedUV = tunnel(distortedUV, u_center, u_tunnel);
  }
  
  // Apply new effects
  if (u_kaleidoscope != 0.0) {
    distortedUV = kaleidoscope(distortedUV, u_center, u_kaleidoscope * 16.0);
  }
  
  if (u_ripple != 0.0) {
    distortedUV = ripple(distortedUV, u_center, u_ripple);
  }
  
  if (u_glitch != 0.0) {
    distortedUV = glitch(distortedUV, u_glitch);
  }
  
  // Clamp to avoid sampling outside texture bounds
  distortedUV = clamp(distortedUV, 0.0, 1.0);
  
  // Sample texture with distorted coordinates
  vec4 col = texture2D(u_image, distortedUV);

  // Apply RGB shift for glitch effect
  if (u_glitch > 0.0) {
    float rgbShift = u_glitch * 0.01;
    col.r = texture2D(u_image, distortedUV + vec2(rgbShift, 0.0)).r;
    col.b = texture2D(u_image, distortedUV - vec2(rgbShift, 0.0)).b;
  }

  // Apply color filters
  
  // Brightness and Contrast
  col.rgb *= u_brightness;
  col.rgb = (col.rgb-.5)*u_contrast+.5;

  // Hue Rotate and Saturate
  vec3 hsl = rgb2hsl(col.rgb);
  hsl.x += u_hue / 360.0; // hue in [0, 1]
  hsl.y *= u_saturate;
  col.rgb = hsl2rgb(hsl);

  // Grayscale
  float g = dot(col.rgb, vec3(.2126, .7152, .0722));
  col.rgb = mix(col.rgb, vec3(g), u_grayscale);

  // Sepia (applied on top of grayscale if both are present)
  col.rgb = mix(col.rgb,
            vec3(dot(col.rgb, vec3(.393, .769, .189)),
                 dot(col.rgb, vec3(.349, .686, .168)),
                 dot(col.rgb, vec3(.272, .534, .131))),
            u_sepia);

  // Invert (applied last)
  col.rgb = mix(col.rgb, vec3(1.0) - col.rgb, u_invert);

  gl_FragColor = col;
} 