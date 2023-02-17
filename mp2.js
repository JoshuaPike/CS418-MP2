
/**
 * @file A webGL drawing of some randomly generated terrain
 * @author Josh Pike <joshuap5@illinois.edu>  
 */

/** @global The WebGL context */
var gl;

/** @global The HTML5 canvas we draw on */
var canvas;

/** @global A simple GLSL shader program */
var shaderProgram;

/** @global The Modelview matrix */
var mvMatrix = glMatrix.mat4.create();

/** @global The Projection matrix */
var pMatrix = glMatrix.mat4.create();

/** @global The Normal matrix (Vertex Normals) */
var nMatrix = glMatrix.mat3.create();

/** @global The matrix stack for hierarchical modeling */
var mvMatrixStack = [];

/** @global The angle of rotation around the y axis */
var viewRot = 10;

/** @global A glmatrix vector to use for transformations */
var transformVec = glMatrix.vec3.create();    

// Initialize the vector....
glMatrix.vec3.set(transformVec,0.0,0.0,-2.0);

/** @global An object holding the geometry for a 3D terrain */
var myTerrain;


// View parameters
/** @global Location of the camera in world coordinates */
var eyePt = glMatrix.vec3.fromValues(0.0,0.2,0.0);
/** @global Direction of the view in world coordinates */
var viewDir = glMatrix.vec3.fromValues(0.0,0,-1.0);
/** @global Up vector for view matrix creation, in world coordinates */
var up = glMatrix.vec3.fromValues(0.0,1.0,0.0);
/** @global Location of a point along viewDir in world coordinates */
var viewPt = glMatrix.vec3.fromValues(0.0,0.0,0.0);

//Light parameters
/** @global Light position in VIEW coordinates */
var lightPosition = [0,3,3];
/** @global Ambient light color/intensity for Phong reflection */
var lAmbient = [0,0,0];
/** @global Diffuse light color/intensity for Phong reflection */
var lDiffuse = [1,1,1];
/** @global Specular light color/intensity for Phong reflection */
var lSpecular =[0,0,0];

//Material parameters
/** @global Ambient material color/intensity for Phong reflection */
var kAmbient = [1.0,1.0,1.0];

/** @global Diffuse material color/intensity for Phong reflection for stone*/
var kTerrainDiffuse = [116.0/255.0, 115.0/255.0, 50.0/255.0];
    
/** @global Specular material color/intensity for Phong reflection */
var kSpecular = [0.0,0.0,0.0];
/** @global Shininess exponent for Blinn-Phong reflection */
var shininess = 40;
/** @global Edge color fpr wireframeish rendering */
var kEdgeBlack = [0.0,0.0,0.0];
/** @global Edge color for wireframe rendering */
var kEdgeWhite = [1.0,1.0,1.0];

// Variables for flight
/** @global An array to contain the currently pressed keys in the browser */
var currentlyPressedKeys = {};
/** @global The current velocity of the "Plane" per frame */
var currentVelocity = 0;
/** @global The current quaternion of the "Plane" */
var currentQuat = glMatrix.quat.create();
/** @global The current direction of the "Plane" */
var direction = glMatrix.vec3.fromValues(0.0, 0.0, 0.0);

/** @global The current rotation angle of the "Plane" */
var rotAng = 0.0;

/** @global boolean to see if it's the first time drawing the scene */
var firstDraw = true;

/** @global boolean to see if we should rotate */
var rotate = false;


//-------------------------------------------------------------------------
/**
 * Sends Modelview matrix to shader
 */
function uploadModelViewMatrixToShader() {
  gl.uniformMatrix4fv(shaderProgram.mvMatrixUniform, false, mvMatrix);
}

//-------------------------------------------------------------------------
/**
 * Sends projection matrix to shader
 */
function uploadProjectionMatrixToShader() {
  gl.uniformMatrix4fv(shaderProgram.pMatrixUniform, 
                      false, pMatrix);
}

//-------------------------------------------------------------------------
/**
 * Generates and sends the normal matrix to the shader
 */
function uploadNormalMatrixToShader() {
  glMatrix.mat3.fromMat4(nMatrix,mvMatrix);
  glMatrix.mat3.transpose(nMatrix,nMatrix);
  glMatrix.mat3.invert(nMatrix,nMatrix);
  gl.uniformMatrix3fv(shaderProgram.nMatrixUniform, false, nMatrix);
}

//----------------------------------------------------------------------------------
/**
 * Pushes matrix onto modelview matrix stack
 */
function mvPushMatrix() {
    var copy = glMatrix.mat4.clone(mvMatrix);
    mvMatrixStack.push(copy);
}


//----------------------------------------------------------------------------------
/**
 * Pops matrix off of modelview matrix stack
 */
function mvPopMatrix() {
    if (mvMatrixStack.length == 0) {
      throw "Invalid popMatrix!";
    }
    mvMatrix = mvMatrixStack.pop();
}

//----------------------------------------------------------------------------------
/**
 * Sends projection/modelview matrices to shader
 */
function setMatrixUniforms() {
    uploadModelViewMatrixToShader();
    uploadNormalMatrixToShader();
    uploadProjectionMatrixToShader();
}

//----------------------------------------------------------------------------------
/**
 * Translates degrees to radians
 * @param {Number} degrees Degree input to function
 * @return {Number} The radians that correspond to the degree input
 */
function degToRad(degrees) {
        return degrees * Math.PI / 180;
}

//----------------------------------------------------------------------------------
/**
 * Creates a context for WebGL
 * @param {element} canvas WebGL canvas
 * @return {Object} WebGL context
 */
function createGLContext(canvas) {
  var names = ["webgl", "experimental-webgl"];
  var context = null;
  for (var i=0; i < names.length; i++) {
    try {
      context = canvas.getContext(names[i]);
    } catch(e) {}
    if (context) {
      break;
    }
  }
  if (context) {
    context.viewportWidth = canvas.width;
    context.viewportHeight = canvas.height;
  } else {
    alert("Failed to create WebGL context!");
  }
  return context;
}

//----------------------------------------------------------------------------------
/**
 * Loads Shaders
 * @param {string} id ID string for shader to load. Either vertex shader/fragment shader
 */
function loadShaderFromDOM(id) {
  var shaderScript = document.getElementById(id);
  
  // If we don't find an element with the specified id
  // we do an early exit 
  if (!shaderScript) {
    return null;
  }
  
  // Loop through the children for the found DOM element and
  // build up the shader source code as a string
  var shaderSource = "";
  var currentChild = shaderScript.firstChild;
  while (currentChild) {
    if (currentChild.nodeType == 3) { // 3 corresponds to TEXT_NODE
      shaderSource += currentChild.textContent;
    }
    currentChild = currentChild.nextSibling;
  }
 
  var shader;
  if (shaderScript.type == "x-shader/x-fragment") {
    shader = gl.createShader(gl.FRAGMENT_SHADER);
  } else if (shaderScript.type == "x-shader/x-vertex") {
    shader = gl.createShader(gl.VERTEX_SHADER);
  } else {
    return null;
  }
 
  gl.shaderSource(shader, shaderSource);
  gl.compileShader(shader);
 
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    alert(gl.getShaderInfoLog(shader));
    return null;
  } 
  return shader;
}

//----------------------------------------------------------------------------------
/**
 * Setup the fragment and vertex shaders
 */
function setupShaders() {
  vertexShader = loadShaderFromDOM("shader-vs");
  fragmentShader = loadShaderFromDOM("shader-fs");
  
  shaderProgram = gl.createProgram();
  gl.attachShader(shaderProgram, vertexShader);
  gl.attachShader(shaderProgram, fragmentShader);
  gl.linkProgram(shaderProgram);

  if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
    alert("Failed to setup shaders");
  }

  gl.useProgram(shaderProgram);

  shaderProgram.vertexPositionAttribute = gl.getAttribLocation(shaderProgram, "aVertexPosition");
  gl.enableVertexAttribArray(shaderProgram.vertexPositionAttribute);

  shaderProgram.vertexNormalAttribute = gl.getAttribLocation(shaderProgram, "aVertexNormal");
  gl.enableVertexAttribArray(shaderProgram.vertexNormalAttribute);

  shaderProgram.mvMatrixUniform = gl.getUniformLocation(shaderProgram, "uMVMatrix");
  shaderProgram.pMatrixUniform = gl.getUniformLocation(shaderProgram, "uPMatrix");
  shaderProgram.nMatrixUniform = gl.getUniformLocation(shaderProgram, "uNMatrix");
  shaderProgram.uniformLightPositionLoc = gl.getUniformLocation(shaderProgram, "uLightPosition");    
  shaderProgram.uniformAmbientLightColorLoc = gl.getUniformLocation(shaderProgram, "uAmbientLightColor");  
  shaderProgram.uniformDiffuseLightColorLoc = gl.getUniformLocation(shaderProgram, "uDiffuseLightColor");
  shaderProgram.uniformSpecularLightColorLoc = gl.getUniformLocation(shaderProgram, "uSpecularLightColor");
  shaderProgram.uniformShininessLoc = gl.getUniformLocation(shaderProgram, "uShininess");    
  shaderProgram.uniformAmbientMaterialColorLoc = gl.getUniformLocation(shaderProgram, "uKAmbient");  
  shaderProgram.uniformDiffuseMaterialColorLoc = gl.getUniformLocation(shaderProgram, "uKDiffuse");
  shaderProgram.uniformSpecularMaterialColorLoc = gl.getUniformLocation(shaderProgram, "uKSpecular");
}

//-------------------------------------------------------------------------
/**
 * Sends material information to the shader
 * @param {Float32} alpha shininess coefficient
 * @param {Float32Array} a Ambient material color
 * @param {Float32Array} d Diffuse material color
 * @param {Float32Array} s Specular material color
 */
function setMaterialUniforms(alpha,a,d,s) {
  gl.uniform1f(shaderProgram.uniformShininessLoc, alpha);
  gl.uniform3fv(shaderProgram.uniformAmbientMaterialColorLoc, a);
  gl.uniform3fv(shaderProgram.uniformDiffuseMaterialColorLoc, d);
  gl.uniform3fv(shaderProgram.uniformSpecularMaterialColorLoc, s);
}

//-------------------------------------------------------------------------
/**
 * Sends light information to the shader
 * @param {Float32Array} loc Location of light source
 * @param {Float32Array} a Ambient light strength
 * @param {Float32Array} d Diffuse light strength
 * @param {Float32Array} s Specular light strength
 */
function setLightUniforms(loc,a,d,s) {
  gl.uniform3fv(shaderProgram.uniformLightPositionLoc, loc);
  gl.uniform3fv(shaderProgram.uniformAmbientLightColorLoc, a);
  gl.uniform3fv(shaderProgram.uniformDiffuseLightColorLoc, d);
  gl.uniform3fv(shaderProgram.uniformSpecularLightColorLoc, s);
}

//----------------------------------------------------------------------------------
/**
 * Populate buffers with data
 */
function setupBuffers() {
    myTerrain = new Terrain(64, -0.75, 0.75, -0.75, 0.75);
    myTerrain.loadBuffers();
}

//----------------------------------------------------------------------------------
/**
 * Draw call that applies matrix transformations to model and draws model in frame
 * This is only called once to draw the first scene
 */
function draw() { 
    //console.log("function draw()")
    var transformVec = glMatrix.vec3.create();
  
    gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // We'll use perspective 
    glMatrix.mat4.perspective(pMatrix,degToRad(70), 
                     gl.viewportWidth / gl.viewportHeight,
                     0.1, 200.0);

    // We want to look down -z, so create a lookat point in that direction    
    
    glMatrix.vec3.add(viewPt, eyePt, viewDir);
    // Then generate the lookat matrix and initialize the MV matrix to that view
    glMatrix.mat4.lookAt(mvMatrix,eyePt,viewPt,up);
    
    
    //var quatMat = glMatrix.mat4.create();
    //glMatrix.mat4.fromQuat(quatMat, currentQuat);
    
    
    //Draw Terrain
    
    
    glMatrix.vec3.set(transformVec,0.0,-0.25,-2.0);
    glMatrix.mat4.translate(mvMatrix, mvMatrix,transformVec);
    glMatrix.mat4.rotateY(mvMatrix, mvMatrix, degToRad(viewRot));
    glMatrix.mat4.rotateX(mvMatrix, mvMatrix, degToRad(-75));
    mvPushMatrix();
    //glMatrix.mat4.multiply(mvMatrix, quatMat, mvMatrix);
    
    setMatrixUniforms();
    setLightUniforms(lightPosition,lAmbient,lDiffuse,lSpecular);
    
    if ((document.getElementById("polygon").checked) || (document.getElementById("wirepoly").checked))
    { 
      setMaterialUniforms(shininess,kAmbient,kTerrainDiffuse,kSpecular); 
      myTerrain.drawTriangles();
    }
    
    if(document.getElementById("wirepoly").checked)
    {
      setMaterialUniforms(shininess,kAmbient,kEdgeBlack,kSpecular);
      myTerrain.drawEdges();
    }

    if(document.getElementById("wireframe").checked)
    {
      setMaterialUniforms(shininess,kAmbient,kEdgeWhite,kSpecular);
      myTerrain.drawEdges();
    }
    mvPopMatrix();
    firstDraw= false;

}

//----------------------------------------------------------------------------------
/**
 * Draw call that applies matrix transformations to model and draws model in frame for the frames after first draw
 */
function drawNext() {
    if (rotate) {
        // We want to look down -z, so create a lookat point in that direction    
        glMatrix.vec3.add(viewPt, eyePt, viewDir);
        //glMatrix.quat.setAxisAngle(currentQuat, viewDir, 0.0);
        rotate = false;
    }
    // Then generate the lookat matrix and initialize the MV matrix to that view
    glMatrix.mat4.lookAt(mvMatrix,eyePt,viewPt,up);
    //glMatrix.mat4.multiply(mvMatrix, quatMat, mvMatrix);
    setMatrixUniforms();
    
    
    mvPushMatrix();
    var transformVec = glMatrix.vec3.create();
    glMatrix.vec3.set(transformVec,0.0,-0.25,-2.0);
    glMatrix.mat4.translate(mvMatrix, mvMatrix,transformVec);
    glMatrix.mat4.rotateY(mvMatrix, mvMatrix, degToRad(viewRot));
    glMatrix.mat4.rotateX(mvMatrix, mvMatrix, degToRad(-75));
    
    
    
    
    setMatrixUniforms();
    
    
    
    if ((document.getElementById("polygon").checked) || (document.getElementById("wirepoly").checked))
    { 
      setMaterialUniforms(shininess,kAmbient,kTerrainDiffuse,kSpecular); 
      myTerrain.drawTriangles();
    }
    
    if(document.getElementById("wirepoly").checked)
    {
      setMaterialUniforms(shininess,kAmbient,kEdgeBlack,kSpecular);
      myTerrain.drawEdges();
    }

    if(document.getElementById("wireframe").checked)
    {
      setMaterialUniforms(shininess,kAmbient,kEdgeWhite,kSpecular);
      myTerrain.drawEdges();
    }
    mvPopMatrix();
}

//----------------------------------------------------------------------------------
/**
 * Startup function called from html code to start program.
 */
 function startup() {
  canvas = document.getElementById("myGLCanvas");
  gl = createGLContext(canvas);
  setupShaders();
  setupBuffers();
  gl.clearColor(1.0, 1.0, 1.0, 1.0);
  gl.enable(gl.DEPTH_TEST);
  document.onkeydown = handleKeyDown;
  document.onkeyup = handleKeyUp;
  tick();
}

//----------------------------------------------------------------------------------
/**
 * Keeping drawing frames....
 */
function tick() {
    requestAnimFrame(tick);
    if (firstDraw) { draw(); }
    else { drawNext(); }
    animate();
}


//---------------------------------------------------------------------------------
/**
 * Handles when a key is pressed down in the browser
 * @param {Object} Carries information about certain events that are happening in the browser
 */
function handleKeyDown(event) {
    //console.log("Key down", event.key, " code ", event.code);
    if (event.key == "ArrowDown" || event.key == "ArrowUp" || event.key == "ArrowLeft" || event.key == "ArrowRight" || event.key == "+" || event.key == "-")
        event.preventDefault();
    currentlyPressedKeys[event.key] = true;
}

//---------------------------------------------------------------------------------
/**
 * Handles when a key is released in the browser
 * @param {Object} Carries information about certain events that are happening in the browser
 */
function handleKeyUp(event) {
    //console.log("Key up", event.key, " code ", event.code);
    currentlyPressedKeys[event.key] = false;
}

//---------------------------------------------------------------------------------
/**
 * Animation to be called from tick. Updates globals and performs animation for each tick.
 */
function animate() {
    var tempQuat = glMatrix.quat.create();
    var quatUpNew = glMatrix.quat.create();
    var quatDirNew = glMatrix.quat.create();
    
    var pitchRotAng = 0;
    var rollRotAng = 0;
    var fakeXAxis = glMatrix.vec3.create();
    
    if (currentlyPressedKeys["ArrowUp"]) {
        // Pitch Down, negative rot abt x
        pitchRotAng = degToRad(0.5);
        
    }
    if (currentlyPressedKeys["ArrowDown"]) {
        // Pitch Up, positive rot abt x
        pitchRotAng = degToRad(-0.5);
        
    }
    if (currentlyPressedKeys["ArrowLeft"]) {
        // Roll Left, negative rot abt z
        rollRotAng = degToRad(-0.5);
        //glMatrix.quat.fromEuler(tempQuat, pitchRotAng, 0, rollRotAng);
        //glMatrix.quat.add(currentQuat, currentQuat, tempQuat);
    }
    if (currentlyPressedKeys["ArrowRight"]) {
        // Roll right, positive rot abt z
        rollRotAng = degToRad(0.5);
        
    }
    
    if (currentlyPressedKeys["ArrowRight"] || currentlyPressedKeys["ArrowLeft"] || currentlyPressedKeys["ArrowUp"] || currentlyPressedKeys["ArrowDown"])
    {
        rotate = true;
    }
    
    
    glMatrix.quat.setAxisAngle(quatUpNew, viewDir, rollRotAng);
    glMatrix.quat.normalize(quatUpNew, quatUpNew);
    glMatrix.vec3.transformQuat(up, up, quatUpNew);
        
    glMatrix.vec3.cross(fakeXAxis, up, viewDir);
    console.log(pitchRotAng);
        
    glMatrix.quat.setAxisAngle(quatDirNew, fakeXAxis, pitchRotAng);
    glMatrix.quat.normalize(quatDirNew, quatDirNew);
    glMatrix.vec3.transformQuat(viewDir, viewDir, quatDirNew);
    
    // have to reset up vector now that viewdir is set
    glMatrix.quat.setAxisAngle(tempQuat, fakeXAxis, pitchRotAng);
    glMatrix.quat.normalize(tempQuat, tempQuat);
    glMatrix.vec3.transformQuat(up, up, tempQuat);
    
    
    // ------- POSITION CHANGE FROM VELOCITY -------
    if (currentlyPressedKeys["+"]) {
        currentVelocity += 0.0001;
    }
    if (currentlyPressedKeys["-"]) {
        currentVelocity -= 0.0001;
    }
    
    
    eyePt[0] += currentVelocity*viewDir[0];
    eyePt[1] += currentVelocity*viewDir[1];
    eyePt[2] += currentVelocity*viewDir[2];
}