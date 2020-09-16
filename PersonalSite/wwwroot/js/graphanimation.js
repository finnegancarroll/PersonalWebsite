//Verticies of our graph
var verticies = [
    [-0.85, -0.85],
    [0.85, -0.85],
    [0, 0.85],
    [0, 0],
    [0, 0.5],
    [0, 0],
    [0.5, -0.5],
    [0, -0.5],
    [-0.5, -0.5],
    [-0.2, .2],
    [0.2, 0.2],
    [0, -.2]
];

//The lines connecting verticies of the graph
var edges = [
    [0, 2],
    [0, 3],
    [0, 8],
    [0, 7],
    [1, 7],
    [1, 6],
    [1, 5],
    [1, 2],
    [2, 5],
    [2, 4],
    [2, 3],
    [3, 8],
    [3, 9],
    [3, 4],
    [4, 9],
    [4, 10],
    [4, 5],
    [5, 10],
    [5, 6],
    [6, 7],
    [6, 11],
    [6, 10],
    [7, 11],
    [7, 8],
    [8, 9],
    [8, 11],
    [9, 10],
    [9, 11],
    [10, 11]
];

//milliseconds in a second
var MSINS = 1000;
//Seconds to cross screen on average
var SPEED = 20;

var canvas = document.querySelector('#graphcanvas');
var gl = canvas.getContext('webgl');
var velocities = [];
var program;



function main() {

    fitCanvasToPage();

    if (!gl) {
        alert('Unable to initialize WebGL. Your browser or machine may not support it.');
        return;
    }

    //Initialize WebGLContext
    initGPUContext();

    //Randomize velocities
    randomizeVel();

    //Begin render loop
    renderLoop();
}

//Variable timestep loop
//Loop executes as fast as possible on client machine
//Time between execution is recorded for fps calculation
//Verticies are updated based on fps such that their speed is uniform across machines
//i.e. slower machines need bigger steps and fewer frames while faster machines
//can animate with many small steps
function renderLoop() {

    //Loops the render function
    //By tracking the speed at which we render we
    //adjust our velocities such that lines move at uniform speeds across machines
    var frameRate = 60;
    var frameCount = 60;
    var lastUpdateTime = Date.now();
    var UPDATE_INTERVAL = 50;

    //Have UPDATE_INTERVAL milliseconds passed?
    if (Date.now() - lastUpdateTime > UPDATE_INTERVAL) {
        //Calculate new frameRate in fps
        frameRate = (frameCount / (Date.now() - lastUpdateTime)) * MSINS;
        //Reset frameCount and update last update timestamp
        lastUpdateTime = Date.now();
        frameCount = 0;
    }

    frameCount++;
    render(frameRate);
    window.requestAnimationFrame(renderLoop);
}

//Draw lines taking from the vertex buffer
function render(fps) {

    var size = verticies[0].length; // Dimension of elemends (2d/34,...)

    //What/Where/How many?
    var primitiveType = gl.LINES;
    var offset = 0;
    var edgeCount = edges.length;

    updateVerticies(verticies.length, size, fps);

    //Load vertices into vertex buffer
    //gl.DYNAMIC_DRAW => Verticies will change frequently
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(getLines()), gl.DYNAMIC_DRAW);

    //Draw objects
    gl.drawArrays(primitiveType, offset, edgeCount * size);
}

//Update the positions of verticies based on velocity and timestep
function updateVerticies(count, size, fps) {

    //There are "count" many verticies each of dimension "size"
    //For each we update their position based on their velocity
    for (i = 0; i < count; i++) {
        for (j = 0; j < size; j++) {

            //The average velocity is .5
            //So if we update the a vertex position by ~.5/fps
            //the vertex will cross about half of the screen in one second
            //multiplying this update by 2/speed causes the vertex to cross 
            //the screen in speed # of seconds 
            //Note: We add 1 to fps in the case that fps approaches zero
            var newPosition = verticies[i][j] + ((2 / SPEED) * ((1 / (fps + 1)) * velocities[i][j]));
            
            //New position out of bounds => reverse velocity
            //Else update position as normal
            if (Math.abs(newPosition) >= 1) {
                velocities[i][j] = velocities[i][j] * -1;
            } else {
                verticies[i][j] = newPosition;
            }
        }
    }
}

//Includes:
//Shader creation and use
//Enable anti aliasing
//Clear color
//Link program to attribute buffer
//Enabling buffers
//Initialize viewport
//Set up vertex attribute pointer
function initGPUContext() {

    //Create shaders
    var vertexShaderSource = document.querySelector("#vertexshader").text;
    var pixelShaderSource = document.querySelector("#pixelshader").text;
    var vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
    var pixelShader = createShader(gl, gl.FRAGMENT_SHADER, pixelShaderSource);

    //Create and use program
    program = createProgram(gl, vertexShader, pixelShader);
    gl.useProgram(program);

    //Create and bind vertex buffer to GPU "handle"
    var positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

    //Some very basic anti aliasing
    gl.enable(gl.SAMPLE_COVERAGE);
    gl.sampleCoverage(0.7, false);

    //Set clear color 
    gl.clearColor(0, 0, 0, 0);

    //Clear the color buffer with specified clear color
    gl.clear(gl.COLOR_BUFFER_BIT);

    //Link the program to the attributes in the buffer
    var positionAttributeLocation = gl.getAttribLocation(program, "a_position");

    //Enable vertex buffer
    gl.enableVertexAttribArray(positionAttributeLocation);

    //Describe how vertices are pulled out of the buffer for rendering
    //gl.vertexAttribPointer(positionAttributeLocation, how many verticies, vertex type, normalize, stride, offset);
    gl.vertexAttribPointer(positionAttributeLocation, verticies[0].length, gl.FLOAT, false, 0, 0);

    //Starting choords and size of screen we will project onto
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
}

//The html canvas element element must be resized from js
function fitCanvasToPage() {
    gl.canvas.width = screen.width;
    gl.canvas.height = screen.height;
}

//A vertex with multiple edges will be passed to opengl once per edge
function getLines() {

    var lines = [];

    //For each edge add the corresponding verticies to the 
    //list of lines to be drawn
    for (i = 0; i < edges.length; i++) {
        var edge = edges[i];
        //x of first vertex of edge
        lines.push(verticies[edge[0]][0]);
        //y of first vertex of edge
        lines.push(verticies[edge[0]][1]);
        //x of second vertex of edge
        lines.push(verticies[edge[1]][0]);
        //y of second vertex of edge
        lines.push(verticies[edge[1]][1]);
    }

    return lines;
}

//Randomize the velocities of verticies
function randomizeVel() {

    for (i = 0; i < verticies.length; i++) {
        var xVel = Math.random();
        //Binary coin flip
        var xSign = Math.floor(Math.random() * 10) % 2;
        if (xSign) { xVel = xVel * -1; }

        var yVel = Math.random();
        //Binary coin flip
        var ySign = Math.floor(Math.random() * 10) % 2;
        if (ySign) { yVel = yVel * -1; }

        velocities.push([xVel, yVel]);
    }
}

//Create and get shader from html source
function createShader(gl, shaderName, source) {
    var shader = gl.createShader(shaderName);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    var result = gl.getShaderParameter(shader, gl.COMPILE_STATUS);

    if (result) {
        return shader;
    }

    //else
    gl.deleteShader();
    window.alert("Shader Creation Failed:" + shaderName);
}

//Together our shaders create a program which must be passed to the GPU for execution
function createProgram(gl, vertexShader, fragmentShader) {
    var program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    var success = gl.getProgramParameter(program, gl.LINK_STATUS);

    if (success) {
        return program;
    }

    console.log(gl.getProgramInfoLog(program));
    gl.deleteProgram(program);
}

main();