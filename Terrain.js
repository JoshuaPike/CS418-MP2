/**
 * @fileoverview Terrain - A simple 3D terrain using WebGL
 * @author Josh Pike
 */

/** Class implementing 3D terrain. */
class Terrain{   
/**
 * Initialize members of a Terrain object
 * @param {number} div Number of triangles along x axis and y axis
 * @param {number} minX Minimum X coordinate value
 * @param {number} maxX Maximum X coordinate value
 * @param {number} minY Minimum Y coordinate value
 * @param {number} maxY Maximum Y coordinate value
 */
    constructor(div,minX,maxX,minY,maxY){
        this.div = div;
        this.minX=minX;
        this.minY=minY;
        this.maxX=maxX;
        this.maxY=maxY;
        
        // Allocate vertex array
        this.vBuffer = [];
        // Allocate triangle array
        this.fBuffer = [];
        // Allocate normal array
        this.nBuffer = [];
        // Allocate array for edges so we can draw wireframe
        this.eBuffer = [];
        console.log("Terrain: Allocated buffers");
        
        this.generateTriangles();
        console.log("Terrain: Generated triangles");
        
        this.generateLines();
        console.log("Terrain: Generated lines");
        
        // Get extension for 4 byte integer indices for drwElements
        var ext = gl.getExtension('OES_element_index_uint');
        if (ext ==null){
            alert("OES_element_index_uint is unsupported by your browser and terrain generation cannot proceed.");
        }
    }
    
    /**
    * Set the x,y,z coords of a vertex at location(i,j)
    * @param {Object} v an an array of length 3 holding x,y,z coordinates
    * @param {number} i the ith row of vertices
    * @param {number} j the jth column of vertices
    */
    setVertex(v,i,j)
    {
        //Your code here
        var vidx = 3*(i*(this.div+1) + j);
        this.vBuffer[vidx] = v[0];
        this.vBuffer[vidx + 1] = v[1];
        this.vBuffer[vidx + 2] = v[2];
    }
    
    /**
    * Return the x,y,z coordinates of a vertex at location (i,j)
    * @param {Object} v an an array of length 3 holding x,y,z coordinates
    * @param {number} i the ith row of vertices
    * @param {number} j the jth column of vertices
    */
    getVertex(v,i,j)
    {
        //Your code here
        var vidx = 3*(i*(this.div+1) + j);
        v[0] = this.vBuffer[vidx];
        v[1] = this.vBuffer[vidx + 1];
        v[2] = this.vBuffer[vidx + 2];
        
    }
    
    /**
    * Set the x,y,z direction of a vertex normal at location(i,j)
    * @param {Object} n an an array of length 3 holding x,y,z normal directions
    * @param {number} i the ith row of vertices
    * @param {number} j the jth column of vertices
    */
    setVertexNormal(n,i,j)
    {
        //Your code here
        var vidx = 3*(i*(this.div+1) + j);
        this.nBuffer[vidx] = n[0];
        this.nBuffer[vidx + 1] = n[1];
        this.nBuffer[vidx + 2] = n[2];
    }
    
    /**
    * Return the x,y,z direction of a vertex normal at location (i,j)
    * @param {Object} n an an array of length 3 holding x,y,z normal directions
    * @param {number} i the ith row of vertices
    * @param {number} j the jth column of vertices
    */
    getVertexNormal(n,i,j)
    {
        //Your code here
        var vidx = 3*(i*(this.div+1) + j);
        n[0] = this.nBuffer[vidx];
        n[1] = this.nBuffer[vidx + 1];
        n[2] = this.nBuffer[vidx + 2];
        
    }
    
    
    /**
    * Send the buffer objects to WebGL for rendering 
    */
    loadBuffers()
    {
        // Specify the vertex coordinates
        this.VertexPositionBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.VertexPositionBuffer);      
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.vBuffer), gl.STATIC_DRAW);
        this.VertexPositionBuffer.itemSize = 3;
        this.VertexPositionBuffer.numItems = this.numVertices;
        console.log("Loaded ", this.VertexPositionBuffer.numItems, " vertices");
    
        // Specify normals to be able to do lighting calculations
        this.VertexNormalBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.VertexNormalBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.nBuffer),
                  gl.STATIC_DRAW);
        this.VertexNormalBuffer.itemSize = 3;
        this.VertexNormalBuffer.numItems = this.numVertices;
        console.log("Loaded ", this.VertexNormalBuffer.numItems, " normals");
    
        // Specify faces of the terrain 
        this.IndexTriBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.IndexTriBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(this.fBuffer),
                  gl.STATIC_DRAW);
        this.IndexTriBuffer.itemSize = 1;
        this.IndexTriBuffer.numItems = this.fBuffer.length;
        console.log("Loaded ", this.IndexTriBuffer.numItems, " triangles");
    
        //Setup Edges  
        this.IndexEdgeBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.IndexEdgeBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(this.eBuffer),
                  gl.STATIC_DRAW);
        this.IndexEdgeBuffer.itemSize = 1;
        this.IndexEdgeBuffer.numItems = this.eBuffer.length;
        
        console.log("triangulatedPlane: loadBuffers");
    }
    
    /**
    * Render the triangles 
    */
    drawTriangles(){
        gl.bindBuffer(gl.ARRAY_BUFFER, this.VertexPositionBuffer);
        gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, this.VertexPositionBuffer.itemSize, 
                         gl.FLOAT, false, 0, 0);

        // Bind normal buffer
        gl.bindBuffer(gl.ARRAY_BUFFER, this.VertexNormalBuffer);
        gl.vertexAttribPointer(shaderProgram.vertexNormalAttribute, 
                           this.VertexNormalBuffer.itemSize,
                           gl.FLOAT, false, 0, 0);   
    
        //Draw 
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.IndexTriBuffer);
        gl.drawElements(gl.TRIANGLES, this.IndexTriBuffer.numItems, gl.UNSIGNED_INT,0);
    }
    
    /**
    * Render the triangle edges wireframe style 
    */
    drawEdges(){
    
        gl.bindBuffer(gl.ARRAY_BUFFER, this.VertexPositionBuffer);
        gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, this.VertexPositionBuffer.itemSize, 
                         gl.FLOAT, false, 0, 0);

        // Bind normal buffer
        gl.bindBuffer(gl.ARRAY_BUFFER, this.VertexNormalBuffer);
        gl.vertexAttribPointer(shaderProgram.vertexNormalAttribute, 
                           this.VertexNormalBuffer.itemSize,
                           gl.FLOAT, false, 0, 0);   
    
        //Draw 
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.IndexEdgeBuffer);
        gl.drawElements(gl.LINES, this.IndexEdgeBuffer.numItems, gl.UNSIGNED_INT,0);   
    }
/**
 * Fill the vertex and buffer arrays 
 */    
generateTriangles()
{
    //Your code here
    var deltaX = (this.maxX - this.minX)/this.div;
    var deltaY = (this.maxY - this.minY)/this.div;
    
    // Have to set up vertices, normals, and faces
    
    // For loop to set up verts and norms (flat terrain)
    for (var i = 0; i <= this.div; i++) {
        for (var j = 0; j <= this.div; j++) {
            this.vBuffer.push(this.minX + deltaX*i);
            this.vBuffer.push(this.minY + deltaY*j);
            this.vBuffer.push(0);
            
            
            this.nBuffer.push(0);
            this.nBuffer.push(0);
            this.nBuffer.push(0);
            
        }
    }
    
    // Iterate terrain for roughness
    for (var it = 0; it < 150; it ++) {
        this.iterateTerrain(0.005);
    }
    
    // Set vertex normals
    for (var i = 0; i < this.div; i++) {
        for (var j = 0; j < this.div; j++) {
            var v1 = [0, 0, 0];
            var v2 = [0, 0, 0];
            var v3 = [0, 0, 0];
            this.getVertex(v1, i, j);
            this.getVertex(v2, i + 1, j);
            this.getVertex(v3, i, j + 1);
            
            var a1 = [v2[0]-v1[0], v2[1]-v1[1], v2[2]-v1[2]];
            var a2 = [v3[0]-v1[0], v3[1]-v1[1], v3[2]-v1[2]];
            
            var N = this.crossProd(a1, a2);
            
            var n1 = [0, 0, 0];
            var n2 = [0, 0, 0];
            var n3 = [0, 0, 0];
            
            this.getVertexNormal(n1, i, j);
            this.getVertexNormal(n2, i + 1, j);
            this.getVertexNormal(n3, i, j + 1);
            
            n1 = [n1[0] + N[0], n1[1] + N[1], n1[2] +N[2]];
            n2 = [n2[0] + N[0], n2[1] + N[1], n2[2] +N[2]];
            n3 = [n3[0] + N[0], n3[1] + N[1], n3[2] +N[2]];
            
            this.setVertexNormal(n1, i, j);
            this.setVertexNormal(n2, i + 1, j);
            this.setVertexNormal(n3, i, j + 1);
            
            
            
            this.getVertex(v1, i + 1, j);
            this.getVertex(v2, i + 1, j + 1);
            this.getVertex(v3, i, j + 1);
            
            var a1 = [v2[0]-v1[0], v2[1]-v1[1], v2[2]-v1[2]];
            var a2 = [v3[0]-v1[0], v3[1]-v1[1], v3[2]-v1[2]];
            
            var N = this.crossProd(a1, a2);
            
            this.getVertexNormal(n1, i + 1, j);
            this.getVertexNormal(n2, i + 1, j + 1);
            this.getVertexNormal(n3, i, j + 1);
            
            n1 = [n1[0] + N[0], n1[1] + N[1], n1[2] +N[2]];
            n2 = [n2[0] + N[0], n2[1] + N[1], n2[2] +N[2]];
            n3 = [n3[0] + N[0], n3[1] + N[1], n3[2] +N[2]];
            
            this.setVertexNormal(n1, i + 1, j);
            this.setVertexNormal(n2, i + 1, j + 1);
            this.setVertexNormal(n3, i, j + 1);        
        }
    }
    
    // For loop to set up faces (Confused about indexing)
    for (var i = 0; i < this.div; i++) {
        for (var j = 0; j < this.div; j++) {
            
            // face buffer of vertex indicies
            var vid = i*(this.div + 1) + j;
            
            this.fBuffer.push(vid);
            this.fBuffer.push(vid + 1);
            this.fBuffer.push(vid + this.div + 1);
            
            this.fBuffer.push(vid + 1);
            this.fBuffer.push(vid + 1 + this.div + 1);
            this.fBuffer.push(vid + this.div + 1);
        }
    }
    
    //
    this.numVertices = this.vBuffer.length/3;
    this.numFaces = this.fBuffer.length/3;
}

    
/**
* Partitions the terrain and increases/decreases heights randomly
* @param {number} delta the amount to increase or decrease Z
*/
iterateTerrain(delta)
{
    // Generate a random point p to partition terrain at
    var randomX = Math.random() * (this.maxX - this.minX) + this.minX;
    var randomY = Math.random() * (this.maxY - this.minY) + this.minY;
    var p = [randomX, randomY, 0];
    
    // Generate a random normal vector for partition plane
    var randomXn = (Math.random() * 2) + -1;
    var randomYn = (Math.random() * 2) + -1;
    var norm = Math.sqrt(Math.pow(randomXn, 2) + Math.pow(randomYn, 2));
    var randomXn = randomXn/norm;
    var randomYn = randomYn/norm;
    var n = [randomXn, randomYn, 0];
    
    for (var i = 0; i <= this.div; i++) {
        for (var j = 0; j <= this.div; j++) {
            
            var b = [0, 0, 0];
            this.getVertex(b, i, j);
            
            var toDot = [b[0] - p[0], b[1] - p[1], b[2] - p[2]];
            var dot = (toDot[0] * n[0]) + (toDot[1] * n[1]) + (toDot[2] * n[2]);
            
            // If dot>0 increase Z
            if (dot > 0) {
                var updatedVert = [b[0], b[1], b[2] + delta];
                this.setVertex(updatedVert, i, j);
            } else {
                var updatedVert = [b[0], b[1], b[2] - delta];
                this.setVertex(updatedVert, i, j);
            }
            
        }
    }
    
}


/**
 * Print vertices and triangles to console for debugging
 */
printBuffers()
    {
        
    for(var i=0;i<this.numVertices;i++)
          {
           console.log("v ", this.vBuffer[i*3], " ", 
                             this.vBuffer[i*3 + 1], " ",
                             this.vBuffer[i*3 + 2], " ");
                       
          }
    
      for(var i=0;i<this.numFaces;i++)
          {
           console.log("f ", this.fBuffer[i*3], " ", 
                             this.fBuffer[i*3 + 1], " ",
                             this.fBuffer[i*3 + 2], " ");
                       
          }
        
    }

/**
 * Generates line values from faces in faceArray
 * to enable wireframe rendering
 */
generateLines()
{
    var numTris=this.fBuffer.length/3;
    for(var f=0;f<numTris;f++)
    {
        var fid=f*3;
        this.eBuffer.push(this.fBuffer[fid]);
        this.eBuffer.push(this.fBuffer[fid+1]);
        
        this.eBuffer.push(this.fBuffer[fid+1]);
        this.eBuffer.push(this.fBuffer[fid+2]);
        
        this.eBuffer.push(this.fBuffer[fid+2]);
        this.eBuffer.push(this.fBuffer[fid]);
    }
    
}
    
/**
* Return the cross product of v1 and v2
* @param {Object} v1 an array of length 3
* @param {Object} v2 an array of length 3
* @return {Object} Cross product of v1 and v2
*/
crossProd(v1, v2) {
    var toRet = [0, 0, 0];
    toRet[0] = (v1[1] * v2[2]) - (v1[2] * v2[1]);
    toRet[1] = -1*((v1[0] * v2[2]) - (v2[0] * v1[2]));
    toRet[2] = (v1[0] * v2[1]) - (v1[1] * v2[0]);
    return toRet;
}
    
}