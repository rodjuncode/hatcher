let img;
let timestampSeed = new Date().getTime();
let a = 0;
let polygons = [];
let currentPolygon = {};
let showImg = true;
let selectedPolygon = undefined;
let polygonsCluster = [];
let polygonsClusterIndex = undefined;

const EDIT_HATCH_ANGLE = 0, EDIT_HATCH_VALUE = 1;
let editHatchMode = EDIT_HATCH_VALUE;

function preload() {
  const urlSearchParams = new URLSearchParams(window.location.search);
  const params = Object.fromEntries(urlSearchParams.entries());
  
  let importPolygons = params.import;
  

  if (importPolygons) {
    polygons = JSON.parse(importPolygons);
  }

  for (p of polygons) {
    p.boundingBox = boundingBox(p);
    p.texture = createGraphics(p.boundingBox.width, p.boundingBox.height);
    hatching(p);
  }

  console.log(polygons);
}

function setup() {
  // set canvas to be as big as browser window  
  createCanvas(windowWidth, windowHeight);

  fileInput = createFileInput(handleFile);
  fileInput.hide(); // Hide the file input element

  // disable right click context menu
  document.addEventListener('contextmenu', event => event.preventDefault());

}

function draw() {
  background(255);

  // Draw the image if it's loaded
  push();
  if (img) {
    if (showImg) {
      let scale = min(width / img.width, height / img.height);
      let newWidth = img.width * scale;
      let newHeight = img.height * scale;
      tint(255, 255, 255, 77); // Apply transparency
      image(img, (width - newWidth) / 2, (height - newHeight) / 2, newWidth, newHeight);
    }
  } else {
    // nothing
  }
  pop();

  // draws all the polygons with black stroke and no fill color
  push();
  noFill();
  for (let polygon of polygons) {
    // check mouse hovering
    if (isPointInPolygon(mouseX, mouseY, polygon.vertexes)) {
      polygon.highlighted = true;
    } else {
      polygon.highlighted = false;
    }

    push();
    if (polygon === selectedPolygon) {
      strokeWeight(3);
      for (v of polygon.vertexes) {
        beginShape();
        for (let v of polygon.vertexes) {
          vertex(v.x, v.y);
        }
        endShape(CLOSE);
      }
    } else {
      stroke(0, 0, 0);
    }

    if (polygon.highlighted && polygon !== selectedPolygon) {
      tint(255, 255, 255, 90);
      // draw the polygon bounds
      // strokeWeight(2);
      // beginShape();
      // for (v of polygon.vertexes) {
      //   beginShape();
      //   for (let v of polygon.vertexes) {
      //     vertex(v.x, v.y);
      //   }
      //   endShape(CLOSE);
      // }
    }
    clip(() => {
      beginShape();
      for (let v of polygon.vertexes) {
        vertex(v.x, v.y);
      }
      endShape(CLOSE);

    })
    image(polygon.texture, polygon.boundingBox.minX, polygon.boundingBox.minY);
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
    vertex(mouseX, mouseY);
    endShape();
  }
  pop();

  if (mouseIsPressed) {

  }
}

function mouseWheel(event) {
  if (!selectedPolygon) return;
  
  if (editHatchMode == EDIT_HATCH_VALUE) {
    if (selectedPolygon) {
      selectedPolygon.hatchAngle += event.delta / 1000;
    }
  } else {
    if (selectedPolygon) {
      selectedPolygon.value += event.delta / 1000;
      selectedPolygon.value = constrain(selectedPolygon.value, 0, 1);
    }
  }
  hatching(selectedPolygon);
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
          vertexes: [{ x: mouseX, y: mouseY }],
          highlighted: false,
          value: random(),
          hatchAngle: random(TWO_PI),
        }
        selectedPolygon = undefined;
      } else {
        currentPolygon.vertexes.push({ x: mouseX, y: mouseY });
      }
      return;
    }
  } else if (mouseButton === RIGHT) {
    let highlightedPolygons = polygons.filter(p => p.highlighted);
    if (polygonsCluster.length > 0 
        && highlightedPolygons.length == polygonsCluster.length 
        && highlightedPolygons.every( e => polygonsCluster.includes(e) )) {
      polygonsClusterIndex = (polygonsClusterIndex + 1) % polygonsCluster.length;
    } else {
      polygonsCluster = highlightedPolygons;
      polygonsClusterIndex = 0;
    }
    selectedPolygon = polygonsCluster[polygonsClusterIndex];
  }
}


function doubleClicked() {
  
  if (isDrawingPolygon()) {
    currentPolygon.boundingBox = boundingBox(currentPolygon);
    currentPolygon.texture = createGraphics(currentPolygon.boundingBox.width, currentPolygon.boundingBox.height);
    hatching(currentPolygon);
    polygons.push(currentPolygon);
    currentPolygon = {};

    console.log("## 🤖: 'You can keep this code to save your work.'")
    console.log(JSON.stringify(
      polygons.map(function(p) { return { vertexes: p.vertexes, value: p.value, angle: p.angle }})
    ));

  }
}

function isDrawingPolygon() {
  return Object.keys(currentPolygon).length !== 0;
}

function handleFile(file) {
  if (file.type === 'image') {
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
  } else if (key === ' ') {
    showImg = !showImg;
  } else if (keyCode === DELETE) {
    polygons = polygons.filter(polygon => polygon !== selectedPolygon);
    selectedPolygon = undefined;
  } else if (keyCode === SHIFT) {
    editHatchMode = (editHatchMode + 1) % 2;
  }

}


// test if a point is inside a polygon
function isPointInPolygon(x, y, polygon) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    let xi = polygon[i].x, yi = polygon[i].y;
    let xj = polygon[j].x, yj = polygon[j].y;
    let intersect = ((yi > y) != (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}


function hatching(currentPolygon) {
  currentPolygon.texture.clear(); // Clear the texture
  currentPolygon.texture.translate(currentPolygon.boundingBox.width / 2, currentPolygon.boundingBox.height / 2); // Move the origin to the center of the canvas
  currentPolygon.texture.rotate(currentPolygon.hatchAngle); // Rotate the canvas by the specified angle
  let size = max(currentPolygon.boundingBox.width, currentPolygon.boundingBox.height)
  let spacing = map(currentPolygon.value, 0, 1, 10, 2); // Map the value parameter to a spacing value

  // let scribble = new Scribble(currentPolygon.texture);
  for (let x = -size; x < size; x += spacing) {
    // scribble.scribbleLine(x, -size, x, size);
    currentPolygon.texture.line(x, -size, x, size);

  }
  currentPolygon.texture.resetMatrix(); // Reset the transformation matrix
}

function clipPolygon(polygon) {
  beginShape();
  for (let v of polygon.vertexes) {
    vertex(v.x, v.y);
  }
  endShape(CLOSE);
}

function boundingBox(polygon) {
  let minX = width;
  let minY = height;
  let maxX = 0;
  let maxY = 0;
  for (let v of polygon.vertexes) {
    minX = min(minX, v.x);
    minY = min(minY, v.y);
    maxX = max(maxX, v.x);
    maxY = max(maxY, v.y);
  }
  return { minX, minY, maxX, maxX, width: maxX - minX, height: maxY - minY };
}

function generateTexture(polygon, value) {
}
