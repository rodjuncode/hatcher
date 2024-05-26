const vert = `#ifdef GL_ES
precision mediump float;
#endif

// =====================================
// Built in p5js uniforms and attributes
// =====================================

uniform mat4 uModelViewMatrix;
uniform mat4 uProjectionMatrix;

attribute vec3 aPosition;    // Vertex position
attribute vec2 aTexCoord;    // Vertex texture coordinate
attribute vec3 aNormal;      // Vertex normal
attribute vec4 aVertexColor; // Vertex color

// =====================================

varying vec3 vPosition;
varying vec2 vTexCoord;

void main() {

  // Store the vertex position for use in the fragment shader
  vPosition = aPosition;
  vTexCoord = aTexCoord;

  // Set the vertex position without any change besides the view transformations
  // Note: it is important to apply these matrices to get your shape to render in the correct location
  gl_Position = uProjectionMatrix * uModelViewMatrix * vec4(aPosition, 1.0);
}`;

const frag2 = `#ifdef GL_ES
precision mediump float;
#endif
  
// Position in world space
varying vec3 vPosition;
// Position in texture space
varying vec2 vTexCoord;

// Ignored
uniform sampler2D uSampler;

// uniform float color;
// uniform float freq;
// uniform vec2 uPolygonSize;
// uniform vec2 uMaxPolygonSize;

uniform float uAngle;
uniform float uDensity;
uniform float uLineWeight;

void main() {

// ##### (1)
//   // Color based on texture coordinate position
//   vec2 st = vTexCoord.xy;
//   vec4 tex = texture2D(uSampler, vTexCoord);

//   float color = 0.0;
//   color += sin(st.x * freq) * 3. + 3.;
//   gl_FragColor = vec4(vec3(1.), 0.0);

//   // Go from red to green on one diagonal and white to black on the other.
//   // gl_FragColor = tex * 0.0 + vec4(st.y, color, (st.x + st.y) / 2., 1.); // R,G,B,A

// ##### (2)
// // Color based on texture coordinate position
// vec2 st = vTexCoord.xy;
// vec4 tex = texture2D(uSampler, vTexCoord);

// float lineWidth = 0.01; // Width of the lines
// float lineSpacing = 0.1; // Spacing between the lines

// // Calculate the y coordinate in line space
// float lineY = mod(st.y, lineSpacing);

// // Determine whether the fragment is part of a line or not
// bool isLine = lineY < lineWidth;

// // Set the fragment color
// if (isLine) {
//   gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0); // Black for the lines
// } else {
//   gl_FragColor = vec4(0.0, 0.0, 0.0, 0.0); // Transparent for the background
// }

// ##### (3)

vec2 st = vTexCoord.xy;
st = rotate(st, uAngle);

float line = step(fract(st.y * uDensity), uLineWeight);

// Simulate hand-drawn effect by adding some noise to the line
line *= noise(st * 10.0);

// Set the fragment color
if (line > 0.0) {
  gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0); // Black for the lines
} else {
  gl_FragColor = vec4(0.0, 0.0, 0.0, 0.0); // Transparent for the background
}


}

// Function to rotate a 2D vector
vec2 rotate(vec2 st, float angle) {
  return vec2(
    st.x * cos(angle) - st.y * sin(angle),
    st.x * sin(angle) + st.y * cos(angle)
  );
}


// Simple noise function
float noise(vec2 st) {
  return fract(sin(dot(st, vec2(12.9898,78.233))) * 43758.5453123);
}

`;

const frag = `#ifdef GL_ES
precision mediump float;
#endif

#define DISTORTION .05

// Position in world space
varying vec3 vPosition;
// Position in texture space
varying vec2 vTexCoord;

// Ignored
uniform sampler2D uSampler;

uniform float uAngle;
uniform float uDensity;
uniform float uLineWidth;

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

  vec2 uv = vTexCoord.xy;
  uv *= rot2d(uAngle);
  uv.x += fbm(uv + fbm(uv)) * DISTORTION;
  
  vec3 col = vec3(0.);
  float lines = abs(sin(uv.x * uDensity * 100.));
  
  float stepIncrement = uDensity / 5.;
  lines = smoothstep(uLineWidth, uLineWidth + stepIncrement, lines);

  col += lines;

  float alpha = 0.;
  if (length(col - vec3(0.)) < .01) {
      alpha = 1.;
  }
  
  gl_FragColor = vec4(col, alpha);


}`;

let S;

let img;
let timestampSeed = new Date().getTime();
let a = 0;
let polygons = [];
let currentPolygon = {};
let showImg = true;
let selectedPolygon = undefined;
let polygonsCluster = [];
let polygonsClusterIndex = undefined;
const VALUE_MIN_VALUE = .5;
const VALUE_MAX_VALUE = 3;
const LINE_WIDTH_MAX_VALUE = 1;

const EDIT_HATCH_ANGLE = 0,
  EDIT_HATCH_VALUE = 1,
  EDIT_LINE_WIDTH = 2;
let editHatchMode = EDIT_HATCH_VALUE;

function preload() {
  // hatchingShader = loadShader("wiggly-lines.vert", "wiggly-lines.frag");

  S = createShader(vert, frag);

  const urlSearchParams = new URLSearchParams(window.location.search);
  const params = Object.fromEntries(urlSearchParams.entries());

  let importPolygons = params.import;

  if (importPolygons) {
    polygons = JSON.parse(importPolygons);
    let n = 0;
    for (p of polygons) {
      // p.boundingBox = boundingBox(p);
      // p.texture = createGraphics(
      //   p.boundingBox.width,
      //   p.boundingBox.height,
      //   WEBGL
      // );
      // hatching(p);
      n++;
    }
    console.log("## 🤖: 'You've just imported " + n + " polygon(s)!'");
  }
}

function setup() {
  // set canvas to be as big as browser window
  createCanvas(windowWidth, windowHeight, WEBGL);

  textureMode(NORMAL);

  fileInput = createFileInput(handleFile);
  fileInput.hide(); // Hide the file input element

  // disable right click context menu
  document.addEventListener("contextmenu", (event) => event.preventDefault());
}

function draw() {
  background(240);
  // Draw the image if it's loaded
  push();
  if (img) {
    if (showImg) {
      let scale = min(width / img.width, height / img.height);
      let newWidth = img.width * scale;
      let newHeight = img.height * scale;
      tint(255, 255, 255, 77); // Apply transparency
      image(
        img,
        (width - newWidth) / 2 - width / 2,
        (height - newHeight) / 2 - height / 2,
        newWidth,
        newHeight
      );
    }
  }
  pop();

  // draws all the existing polygons
  push();

  // noFill();
  shader(S);
  blendMode(DARKEST);
  // let maxPolygonSize = calculateMaxPolygonSize(polygons);
  // S.setUniform('uMaxPolygonSize', [maxPolygonSize.width, maxPolygonSize.height]);
  for (let polygon of polygons) {
    // check mouse hovering
    if (
      isPointInPolygon(
        mouseX - width / 2,
        mouseY - height / 2,
        polygon.vertexes
      )
    ) {
      polygon.highlighted = true;
    } else {
      polygon.highlighted = false;
    }

    push();
    if (polygon === selectedPolygon) {
      push();
      stroke("cyan");
      strokeWeight(3);
      noFill();
      for (v of polygon.vertexes) {
        beginShape();
        for (let v of polygon.vertexes) {
          vertex(v.x, v.y);
        }
        endShape(CLOSE);
      }
      pop();
    }

    if (polygon.highlighted && polygon !== selectedPolygon) {
      // tint(255, 255, 255, 90);
      // draw the polygon bounds
      push();
      noFill();
      strokeWeight(2);
      beginShape();
      for (v of polygon.vertexes) {
        beginShape();
        for (let v of polygon.vertexes) {
          vertex(v.x, v.y);
        }
        endShape(CLOSE);
      }
      pop();
    }

    // Calculate the size of the polygon
    //  let polygonSize = calculatePolygonSize(polygon);

    //  // Set the value of the uPolygonSize uniform variable
    //  S.setUniform('uPolygonSize', [polygonSize.width, polygonSize.height]);

    // S.setUniform("freq", 300.0);
    S.setUniform("uAngle", parseFloat(polygon.hatchAngle));
    S.setUniform("uDensity", parseFloat(polygon.value));
    S.setUniform("uLineWidth", parseFloat(polygon.lineWidth));
    drawPolygon(polygon);

    // clip(() => {
    //   push();
    //   c = color(0);
    //   c.setAlpha(0);
    //   fill(c);
    //   noStroke();
    //   beginShape();
    //   for (let v of polygon.vertexes) {
    //     vertex(v.x, v.y, 0);
    //   }
    //   endShape(CLOSE);
    //   pop();
    // });
    // blendMode(DARKEST)
    // image(polygon.texture, polygon.boundingBox.minX, polygon.boundingBox.minY);
    pop();
  }
  pop();

  // if there is a current polygon, draw it with magenta stroke and no fill color.
  // the current mouse position should be also drawn as the last vertex of the polygon
  push();
  noFill();
  stroke(255, 0, 255);
  if (isDrawingPolygon()) {
    strokeWeight(1);
    beginShape();
    for (let v of currentPolygon.vertexes) {
      vertex(v.x, v.y);
    }
    vertex(mouseX - width / 2, mouseY - height / 2);
    endShape();
  }
  pop();
}

function mouseWheel(event) {
  if (!selectedPolygon) return;

  if (editHatchMode == EDIT_HATCH_ANGLE) {
    if (selectedPolygon) {
      selectedPolygon.hatchAngle += event.delta / 500;
      console.log('angle')
    }
  } else if (editHatchMode == EDIT_HATCH_VALUE) {
    if (selectedPolygon) {
      selectedPolygon.value += event.delta / 500;
      selectedPolygon.value = constrain(
        selectedPolygon.value,
        VALUE_MIN_VALUE,
        VALUE_MAX_VALUE
      );
    }
    console.log('value')
  } 
  // else if (editHatchMode == EDIT_LINE_WIDTH) {
  //   if (selectedPolygon) {
  //     selectedPolygon.lineWidth += event.delta / 500;
  //     selectedPolygon.value = constrain(
  //       selectedPolygon.lineWidth,
  //       0.1,
  //       LINE_WIDTH_MAX_VALUE
  //     );
  //   }
  //   console.log('line width')
  // }
  // hatching(selectedPolygon);
}

function mouseClicked() {
  if (!img) {
    fileInput.elt.click();
    return;
  }
}

function mousePressed() {
  if (mouseButton === LEFT) {
    if (img) {
      if (!isDrawingPolygon()) {
        currentPolygon = {
          vertexes: [{ x: mouseX - width / 2, y: mouseY - height / 2 }],
          highlighted: false,
          value: random(VALUE_MIN_VALUE, VALUE_MAX_VALUE),
          hatchAngle: random(TWO_PI),
          lineWidth: .3,
        };
        selectedPolygon = undefined;
      } else {
        currentPolygon.vertexes.push({
          x: mouseX - width / 2,
          y: mouseY - height / 2,
        });
      }
      return;
    }
  } else if (mouseButton === RIGHT) {
    let highlightedPolygons = polygons.filter((p) => p.highlighted);
    if (
      polygonsCluster.length > 0 &&
      highlightedPolygons.length == polygonsCluster.length &&
      highlightedPolygons.every((e) => polygonsCluster.includes(e))
    ) {
      polygonsClusterIndex =
        (polygonsClusterIndex + 1) % polygonsCluster.length;
    } else {
      polygonsCluster = highlightedPolygons;
      polygonsClusterIndex = 0;
    }
    selectedPolygon = polygonsCluster[polygonsClusterIndex];
  }
}

function doubleClicked() {
  if (isDrawingPolygon() && currentPolygon.vertexes.length >= 3) {
    // currentPolygon.boundingBox = boundingBox(currentPolygon);
    // currentPolygon.texture = createGraphics(
    //   currentPolygon.boundingBox.width,
    //   currentPolygon.boundingBox.height,
    //   WEBGL
    // );
    // hatching(currentPolygon);
    polygons.push(currentPolygon);

    
    currentPolygon = {};

    console.log("## 🤖: 'You can keep this code to save your work.'");
    console.log(
      JSON.stringify(
        polygons.map(function (p) {
          return {
            vertexes: p.vertexes,
            value: p.value,
            hatchAngle: p.hatchAngle,
            lineWidth: p.lineWidth,
          };
        })
      )
    );
  }
}

function isDrawingPolygon() {
  return Object.keys(currentPolygon).length !== 0;
}

function handleFile(file) {
  if (file.type === "image") {
    img = loadImage(file.data);
  } else {
    img = null;
  }
}

// test ESC key. If pressed, clear the current polygon
function keyPressed() {
  if (keyCode === ESCAPE) {
    currentPolygon = {};
    selectedPolygon = undefined;
  } else if (key === " ") {
    showImg = !showImg;
  } else if (keyCode === DELETE) {
    polygons = polygons.filter((polygon) => polygon !== selectedPolygon);
    selectedPolygon = undefined;
  } else if (keyCode === SHIFT) {
    editHatchMode = (editHatchMode + 1) % 2;
  }
}

// test if a point is inside a polygon
function isPointInPolygon(x, y, polygon) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    let xi = polygon[i].x,
      yi = polygon[i].y;
    let xj = polygon[j].x,
      yj = polygon[j].y;
    let intersect =
      yi > y != yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}
// function clipPolygon(polygon) {
//   push();
//   beginShape();
//   for (let v of polygon.vertexes) {
//     vertex(v.x, v.y);
//   }
//   endShape(CLOSE);
//   pop();
// }

// function boundingBox(polygon) {
//   let minX = width/2;
//   let minY = height/2;
//   let maxX = -width/2;
//   let maxY = -height/2;
//   for (let v of polygon.vertexes) {
//     minX = min(minX, v.x);
//     minY = min(minY, v.y);
//     maxX = max(maxX, v.x);
//     maxY = max(maxY, v.y);
//   }
//   return { minX, minY, maxX, maxX, width: maxX - minX, height: maxY - minY };
// }

// function generateTexture(polygon, value) {}

function drawPolygon(polygon) {
  beginShape();
  normal(0, 0, 1);
  noStroke();

  let vertices = polygon.vertexes;

  // Calculate the bounds of the vertices
  let minX = Math.min(...vertices.map((v) => v.x));
  let maxX = Math.max(...vertices.map((v) => v.x));
  let minY = Math.min(...vertices.map((v) => v.y));
  let maxY = Math.max(...vertices.map((v) => v.y));

  // Add each vertex to the shape
  for (let i = 0; i < vertices.length; i++) {
    let u = map(vertices[i].x, minX, maxX, 0, 1);
    let v = map(vertices[i].y, minY, maxY, 0, 1);
    vertex(vertices[i].x, vertices[i].y, u, v);
  }

  endShape(CLOSE); // Use CLOSE to connect the last vertex back to the first
}

// function drawPolygon(polygon) {
//   beginShape();
//   normal(0, 0, 1);

//   let vertices = polygon.vertexes;

//   // Add each vertex to the shape
//   for (let i = 0; i < vertices.length; i++) {
//     let u = map(vertices[i].x, 0, width, 0, 1);
//     let v = map(vertices[i].y, 0, height, 0, 1);
//     vertex(vertices[i].x, vertices[i].y, u, v);
//   }

//   endShape(CLOSE); // Use CLOSE to connect the last vertex back to the first
// }

function calculatePolygonSize(polygon) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (let vertex of polygon.vertexes) {
    minX = Math.min(minX, vertex.x);
    minY = Math.min(minY, vertex.y);
    maxX = Math.max(maxX, vertex.x);
    maxY = Math.max(maxY, vertex.y);
  }

  return {
    width: maxX - minX,
    height: maxY - minY,
  };
}

function calculateMaxPolygonSize(polygons) {
  let maxWidth = -Infinity;
  let maxHeight = -Infinity;

  for (let polygon of polygons) {
    let polygonSize = calculatePolygonSize(polygon);
    maxWidth = Math.max(maxWidth, polygonSize.width);
    maxHeight = Math.max(maxHeight, polygonSize.height);
  }

  return {
    width: maxWidth,
    height: maxHeight,
  };
}
