let img;
let timestampSeed = new Date().getTime();
let a = 0;
let polygons = [];
let currentPolygon = {};
let showImg = true;

function setup() {
  // set canvas to be as big as browser window  
  createCanvas(windowWidth, windowHeight);

  fileInput = createFileInput(handleFile);
  fileInput.hide(); // Hide the file input element

}

function draw() {
  background(220);

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
  stroke(0, 0, 0);
  noFill();
  for (let polygon of polygons) {
    push();
    if (polygon.highlighted) {
      // draw the polygon bounds
      strokeWeight(2);
      beginShape();
      for (v of polygon.vertexes) {
        beginShape();
        for (let v of polygon.vertexes) {
          vertex(v.x, v.y);
        }
        endShape(CLOSE);
      }
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



}

function mouseClicked() {
  if (img) {
    if (!isDrawingPolygon()) {
      currentPolygon = {
        vertexes: [{ x: mouseX, y: mouseY }],
        highlighted: false,
        value: random(),
        hatchAngle: random(TWO_PI),
      }
    } else {
      currentPolygon.vertexes.push({ x: mouseX, y: mouseY });
    }
    return;
  }
  // Open the file dialog when the user clicks on the canvas
  fileInput.elt.click();
}

function doubleClicked() {
  if (isDrawingPolygon()) {
    currentPolygon.boundingBox = boundingBox(currentPolygon);
    currentPolygon.texture = createGraphics(currentPolygon.boundingBox.width, currentPolygon.boundingBox.height);
    hatching(currentPolygon);
    polygons.push(currentPolygon);
    currentPolygon = {};
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
  } else if (key === ' ') {
    showImg = !showImg;
  }

}

// test if mouse is over any polygon
function mouseMoved() {
  for (let polygon of polygons) {
    if (isPointInPolygon(mouseX, mouseY, polygon.vertexes)) {
      polygon.highlighted = true;
    } else {
      polygon.highlighted = false;
    }
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
