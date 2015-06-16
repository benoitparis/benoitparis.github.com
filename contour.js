// Settings
var CANVAS_SIZE_PX = 512;
var drawPrecision  = 1 / (2 * CANVAS_SIZE_PX); // 4 recommended (1: half-pixel precision, 1024: dont cut-off lines)

var repaint;           // Global function. Needs to be called after adding segments to be drawn.
var segmentArray = []; // Where the dz segments are store.
var gl;                // Binded on the canvas.

function start() {

	var canvas = document.getElementById("canvasIntegral");
    setupUI(canvas);
	gl = getGl(canvas);
	
	// This is where calculations are saved
	var frame0 = createFrame(CANVAS_SIZE_PX);
	var frame1 = createFrame(CANVAS_SIZE_PX);
	
	//// Pipeline setup
	/*
		UI --(pushes)--> dz segments in segmentArray --(pops several)--> Integral part for each dz              ---> hsl to rgb on canvas
		         |                                           |           frame0 swapped with frame1 for each dz               |
		         |                                           |           (you can't write where you read)                     |
                 |                                           |                        |                                       |             
                 |                                           |                        |                                       |            
              line()                                       run()  --synch-----> calculateSegment()                         repaintCanvas(), which sees what framerate the user sees
                                                                  --asynch----------------------------------------------->          
                                                                  <-synch, with framerate information stored -------------

                                                                  This loop is activated only if there are segments
                                                                  to be calculated. The synch calls to calculateSegment() 
                                                                  are made to leave time for a smooth framerate with repaint()s, 
                                                                  while calculating the most segments possible.
        repaint() will activate the loop, in a singleton manner.
	*/
	// pipeline definition
	var vertexShader   = getShader("shader-vertex");
	var hslToRgbShader = getShader("shader-hsltorgb");
	var calcShader     = getShader("shader-calc");
	var hslToRgbProgram = getProgram(vertexShader, hslToRgbShader);
	var calcProgram     = getProgram(vertexShader, calcShader);
	createVertices();

	// Variable binding
	var aVec2  = gl.getUniformLocation(calcProgram, "u_a");
	var dxVec2 = gl.getUniformLocation(calcProgram, "u_dx");



	// pipeline usage
	var lastRepaintDate = Date.now();
	var lastRepaintTime = 250;
	function repaintCanvas() {
		gl.useProgram(hslToRgbProgram);
		gl.bindTexture(gl.TEXTURE_2D, lastFrameOutput == 1 ? frame1.texture : frame0.texture );
		gl.bindFramebuffer(gl.FRAMEBUFFER, null);
		gl.drawArrays(gl.TRIANGLE_STRIP, 0, 5);
		gl.flush();
		var now = Date.now();
		lastRepaintTime = now - lastRepaintDate;
		lastRepaintDate = now ;					
		needToRepaint = false;					
		run();
	}
	
	var numberOfCalcCycles = 100;
	var MIN_CALC_CYCLES = 5;
	// benchmark and UX says 15Hz is a good target.
	var IDEAL_FRAME_TIME = 1000 / 15;
	var GPU_JITTER_SMOOTHING_FACTOR = 10;
	running = false;
	function run() {
		running = true;
		numberOfCalcCycles = Math.min(
			segmentArray.length,
			Math.max(
				MIN_CALC_CYCLES,
				numberOfCalcCycles * ( 1 + ((IDEAL_FRAME_TIME - lastRepaintTime) / IDEAL_FRAME_TIME) / GPU_JITTER_SMOOTHING_FACTOR ) // adaptative 
			)
		);
		document.getElementById('console').value = "Last duration: " + lastRepaintTime + "ms. Adding " + Math.floor(numberOfCalcCycles) + " cycles between frames. Segments left: " + segmentArray.length + ".";

		for(var i = 0 ; i < numberOfCalcCycles && segmentArray.length > 0 ; i++) {
			calculateSegment(segmentArray.pop());
		}
		if (needToRepaint) {
			window.requestAnimationFrame(repaintCanvas);
		} else {
			running = false;
		}
	}

	var lastFrameOutput = 1;
	var needToRepaint = true;
	function calculateSegment(currentPoint) {
		// read-write swapping
		var currentTexture, currentFrameBuffer;
		if ( lastFrameOutput == 1 ) {
		 	currentTexture = frame1.texture;
			currentFrameBuffer = frame0.frameBuffer; 
			lastFrameOutput = 0 ;
		} else {
			currentTexture = frame0.texture ;
			currentFrameBuffer = frame1.frameBuffer ; 
			lastFrameOutput = 1 ;
		}
		gl.bindTexture(gl.TEXTURE_2D, currentTexture);
		gl.bindFramebuffer(gl.FRAMEBUFFER, currentFrameBuffer);
		
		// bind segment, and draw
		gl.useProgram(calcProgram);
		gl.uniform2f(aVec2 , currentPoint[0], currentPoint[1]);
		gl.uniform2f(dxVec2, currentPoint[2], currentPoint[3]);
	
		gl.drawArrays(gl.TRIANGLE_STRIP, 0, 5);
		gl.flush(); 
		needToRepaint = true;
	}


	//// function export
	repaint = function () {
		if (!running) {
			run();
		}
	}


	//// startup
	repaint();
}



// shapes
function performanceTestShape() {
	// -!TODO- find what the grid is for ~(drawPrecision optimal tuning)
	// --> good grid here is : 
	//  / / / /
	// / / / /  with 1/512 = 0.00048828125*4 as step
	for (var i = 0 ; i < 2047 ; i++){
		segmentArray.push([1.0 - i/2047 , 1.0 - i/2047, 1/2047, 1/2047]);
	}
	repaint();
}

// TODO gerer le segment simple aussi
function line(points){
	var ax = points[0];
	var ay = points[1];
	var bx = points[2];
	var by = points[3];

	var cx = (ax+bx)/2.0;
	var cy = (ay+by)/2.0;
	if (Math.abs(ax-bx) > drawPrecision*2 || Math.abs(ay-by) > drawPrecision*2 ) {
		line([ax,ay,cx,cy]);
		line([cx,cy,bx,by]);
	} else {
		segmentArray.push([ cx, cy, bx-ax, by-ay ]);
	}
	
}
function getGridPoint(p) {
	return Math.round(p*CANVAS_SIZE_PX)/CANVAS_SIZE_PX;
}

function rect( ax, ay, sx, sy){
	line([ax,ay,ax+sx,ay]);
	line([ax+sx,ay,ax+sx,ay+sy]);
	line([ax+sx,ay+sy,ax,ay+sy]);
	line([ax,ay+sy,ax,ay]);
}
function circle( ax, ay, r ){
	var iMax = Math.ceil(2 * Math.PI * r / drawPrecision);
	var lastX = ax + r;
	var lastY = ay;
	for ( var i = 0; i<=iMax; i++){
		var theta = i / iMax * 2 * Math.PI;
		var newX = ax + r * Math.cos(theta);
		var newY = ay + r * Math.sin(theta);
		line([lastX,lastY,newX,newY]);
		lastX = newX;
		lastY = newY;
	}
}
function levyDragon( ax, ay, bx, by ) {
	if ( (Math.abs(ax-bx) > drawPrecision || Math.abs(ay-by) > drawPrecision)) {
		var cx = ax - ( by - ay - bx + ax ) / 2;
		var cy = ay + ( by - ay + bx - ax ) / 2;
		levyDragon( ax, ay, cx, cy         );
		levyDragon(         cx, cy, bx, by );
	} else {
		line( [ax, ay, bx, by] );
	}
}

function shuffle() {
	for(var j, x, i = segmentArray.length;
		i;
		j = parseInt(Math.random() * i),
		x = segmentArray[--i],
		segmentArray[i] = segmentArray[j],
		segmentArray[j] = x
	) {}
}


// UI setup helpers
var mouseLastOffsetX = -1;
var mouseLastOffsetY = -1;
function setupUI(canvas){
	canvas.onmousemove = function(e){
		if (e.which === 1){
			if (mouseLastOffsetX !== -1) {
				line([mouseLastOffsetX / CANVAS_SIZE_PX, 1 - mouseLastOffsetY / CANVAS_SIZE_PX, 
					  e.offsetX        / CANVAS_SIZE_PX, 1 - e.offsetY        / CANVAS_SIZE_PX]);
				repaint();
			}					
			mouseLastOffsetX = e.offsetX;
			mouseLastOffsetY = e.offsetY;				
		} else {
			mouseLastOffsetX = -1
		}
	};
}
function levyButton(){
	levyDragon(0.4 ,0.2, 0.8 , 0.6 );
	line( [.8, .6, .4, .2] );
	shuffle();
	repaint();
}

function circleButton(){
	circle(0.5,0.5,0.25);
	repaint();
}

function squareButton(){
	rect(0.25,0.25,0.5,0.5);
	repaint();
}


// GL setup helpers
function getGl(canvas){
	// init WebGL with floating point operations
	var result;
	try {
		result = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
	} catch(e) {
		console.log("Problem loading WebGL"); 
		console.log(e.toString()); 
	}
	result.getExtension("OES_texture_float");
	result.getExtension("OES_texture_float_linear");
	return result;			
}

function createFrame(n){
	// init FrameBuffers, associate with textures
	var texture = gl.createTexture();
	gl.bindTexture(gl.TEXTURE_2D, texture);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);		
	gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, n, n, 0, gl.RGBA, gl.FLOAT, null);
	
	var frameBuffer = gl.createFramebuffer();
	gl.bindFramebuffer(gl.FRAMEBUFFER, frameBuffer);
	gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
	return { texture:texture, frameBuffer:frameBuffer };
}

function getShader(nodeId){
	// shader creation
	var shaderSourceNode = document.getElementById(nodeId);		
	var shaderSource = shaderSourceNode.firstChild.textContent;				
	var shader = gl.createShader(shaderSourceNode.type == "x-shader/x-vertex" ? gl.VERTEX_SHADER : gl.FRAGMENT_SHADER );
	gl.shaderSource(shader, shaderSource);
	gl.compileShader(shader);
	console.log(nodeId +" compile status = " + gl.getShaderParameter(shader, gl.COMPILE_STATUS));
	return shader;
}

function getProgram(vertexShader, fragmentShader) {
	var program = gl.createProgram();
	gl.attachShader(program, vertexShader);
	gl.attachShader(program, fragmentShader);
	gl.linkProgram(program);
	console.log("Program link status = " + gl.getProgramParameter(program, gl.LINK_STATUS));
	return program;
}

function createVertices(){
	// vertices definition and binding
	gl.enableVertexAttribArray(0);
	gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
	var vertices = [ -1., -1., 1., -1., 1., 1., -1., 1., -1., -1. ];
	gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
}


// weird examples


/*line([0.8,1.0,0.0,0.0]);
line([0.0,0.0,0.6,1.0]);
line([0.4,1.0,0.0,0.0]);
line([0.0,0.0,0.2,1.0]);*/


//shuffle();

/*
TODO:
Test with high density grid of segments array weirdly oriented
With a generator that can accept modificators of mod+x elements
Also, make the dx value definable by a function of the position (ex what does a vortex look like?).
*/



/*
// 512x512 sized levy dragon
levyDragon(0.4 ,0.2, 0.8 , 0.6 );
line( [.8, .6, .4, .2] );
*/
/*
// symetry wrapper with funny parameters
// a faire avec des segments array!
drawPrecision = 0.4;

var sens = 
	[ -1.0 , -1.0 , 
	  +1.0 , +1.0 ];
var direction = 
	[ 1.0 , -1.0 , 
	  -1.0 , 1.0 ];
var position = 1.0;

line(
	[ 0.5-0.5*sens[0]             -0.25*position, 
	  0.5-0.5*sens[0]*direction[0]+0.25         , 
	  0.5+0.5*sens[0]             -0.25*position, 
	  0.5+0.5*sens[0]*direction[0]+0.25         ]);
line(
	[ 0.5-0.5*sens[1]             +0.25         , 
	  0.5-0.5*sens[1]*direction[1]+0.25*position, 
	  0.5+0.5*sens[1]             +0.25         , 
	  0.5+0.5*sens[1]*direction[1]+0.25*position]);
line(
	[ 0.5-0.5*sens[2]             -0.25         , 
	  0.5-0.5*sens[2]*direction[2]-0.25*position, 
	  0.5+0.5*sens[2]             -0.25         , 
	  0.5+0.5*sens[2]*direction[2]-0.25*position]);
line(
	[ 0.5-0.5*sens[3]             +0.25*position, 
	  0.5-0.5*sens[3]*direction[3]-0.25         , 
	  0.5+0.5*sens[3]             +0.25*position, 
	  0.5+0.5*sens[3]*direction[3]-0.25         ]);
*/

/*
// b/w alternate
// drawPrecision = 10.0;
for ( var i = -10 ; i < 11 ; i++ ) {
	line([0.0+(i-0.25)/5.0,0.0+(i-0.25)/5.0,1.0+(i-0.25)/5.0,1.0+(i-0.25)/5.0]);
	line([1.0+(i+0.25)/5.0,1.0+(i+0.25)/5.0,0.0+(i+0.25)/5.0,0.0+(i+0.25)/5.0]);
}
*/

/*
// zipped line with parabolas
// drawPrecision = 10.0;
for ( var i = -10 ; i < 11 ; i++ ) {
	line([0.0+(i-0.25)/50.0,0.0+(i-0.25)/50.0,1.0+(i-0.25)/50.0,1.0+(i-0.25)/50.0]);
	line([1.0+(i+0.25)/50.0,1.0+(i+0.25)/50.0,0.0+(i+0.25)/50.0,0.0+(i+0.25)/50.0]);
}
*/
/*
// zip zoom
// drawPrecision = 10.0;
for ( var i = -10 ; i < 11 ; i++ ) {
	line([0.0+(i-0.25)/5.0,0.0-(i-0.25)/5.0,1.0+(i-0.25)/5.0,1.0-(i-0.25)/5.0]);
	line([1.0+(i+0.25)/5.0,1.0-(i+0.25)/5.0,0.0+(i+0.25)/5.0,0.0-(i+0.25)/5.0]);
}
*/
/*
// separation coloree
// drawPrecision = 10.0;
for ( var i = -10 ; i < 11 ; i++ ) {
	line([0.0+i/5.0,0.0-i/5.0,1.0+i/5.0,1.0-i/5.0]);
}
*/

/*
// nice diagonals
// drawPrecision = 10.0;
for ( var i = -10 ; i < 11 ; i++ ) {
	line([0.0+i/25.0,0.0+i/25.0,1.0+i/25.0,1.0+i/25.0]);
}
*/
/*
// diagonal balls
// drawPrecision = 10.0;
for ( var i = -10 ; i < 11 ; i++ ) {
	line([0.0+i/10.0,0.0+i/10.0,1.0+i/10.0,1.0+i/10.0]);
}
*/

// funny balls extension
// drawPrecision = 0.1;
// drawPrecision = 10.0;
/*
for ( var i = -2 ; i < 2 ; i++ ) {
	line([0.05+i/10.0,0.05+i/10.0,1.05+i/10.0,1.05+i/10.0]);
}
*/
/*
// funny ball
// drawPrecision = 10.0;
line([-0.05,-0.05,0.95,0.95]);
line([0.05,0.05,1.05,1.05]);
*/


// rounding errors zoom, patterns fun
// precision 10000000
// rounding debut à 200
// rounding exemple à 2000
// pattern fun à 20000
// 200000 on zoome sur les cercles concentriques puis les patterns complesxes centraux apparaissent 
/*
drawPrecision = 1.0;
for ( var i = 201 ; i>0 ; i-- ) {
	line([1.0,1.0,0.0,0.0]);
}
line([-100.0,-100.0,101.0,101.0]);
*/

/*				
// creep lumineux
// avec précision 0.05
for ( var i = 40 ; i>0 ; i-- ) {
	rect(0.5-i/80,0.5-i/80,i/40,i/40);
}
*/	

// flux à droite
// avec précision 0.05
/*
drawPrecision = 0.05;
for ( var i = 120 ; i>0 ; i-- ) {
	circle(i/30,0.5,i/40);
}
*/

