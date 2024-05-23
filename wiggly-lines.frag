#ifdef GL_ES
precision mediump float;
#endif

uniform vec2 u_resolution;
uniform float u_density;
//uniform float u_rotation;
#define ROTATION .3

#define LINE_WIDTH .1
#define DISTORTION .05

float random (in vec2 st) {
    return fract(sin(dot(st.xy,
                         vec2(12.9898,78.233)))*
        43758.5453123);
}

// Based on Morgan McGuire @morgan3d
// https://www.shadertoy.com/view/4dS3Wd
float noise (in vec2 st) {
    vec2 i = floor(st);
    vec2 f = fract(st);

    // Four corners in 2D of a tile
    float a = random(i);
    float b = random(i + vec2(1.0, 0.0));
    float c = random(i + vec2(0.0, 1.0));
    float d = random(i + vec2(1.0, 1.0));

    vec2 u = f * f * (3.0 - 2.0 * f);

    return mix(a, b, u.x) +
            (c - a)* u.y * (1.0 - u.x) +
            (d - b) * u.x * u.y;
}

#define OCTAVES 6
float fbm (in vec2 st) {
    // Initial values
    float value = 0.0;
    float amplitude = .5;
    float frequency = 0.;
    //
    // Loop of octaves
    for (int i = 0; i < OCTAVES; i++) {
        value += amplitude * noise(st);
        st *= 2.;
        amplitude *= .5;
    }
    return value;
}

mat2 rot2d (float a) {
    return mat2(cos(a), -sin(a), sin(a), cos(a));
}

void main() {
    vec2 uv = gl_FragCoord.xy/u_resolution.xy;
    uv *= rot2d(ROTATION);
    uv.x += fbm(uv + fbm(uv)) * DISTORTION;
    
    vec3 col = vec3(0.);
    float lines = abs(sin(uv.x * u_density * 100.));
    
    float stepIncrement = u_density / 3.;
    lines = smoothstep(LINE_WIDTH, LINE_WIDTH + stepIncrement, lines);

    col += lines;

    float alpha = 1.;
    if (length(col - vec3(1.)) < .01) {
        alpha = 0.;
    }

    gl_FragColor = vec4(col, alpha);
}