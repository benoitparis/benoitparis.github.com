// Settings
const CANVAS_SIZE_PX = 512;
let canvas = document.getElementById('canvasIntegral');
canvas.width = CANVAS_SIZE_PX;
canvas.height = CANVAS_SIZE_PX;
let pixelPrecision = 0;
let drawPrecision = () => (2 ** pixelPrecision) / CANVAS_SIZE_PX;

// Globals
let repaint;                   // Needs to be called after adding segments to be drawn.
let segmentArray = [];         // Where the dz segments are store.
let gl;                        // Bound to the canvas.
let needsToBeShuffled = false;
let repaintCanvas;

// Pipeline setup
function start() {

    const canvas = document.getElementById("canvasIntegral");
    setupUI(canvas);
    gl = getGl(canvas);

    // This is where calculations are saved
    const frame0 = createFrame(CANVAS_SIZE_PX);
    const frame1 = createFrame(CANVAS_SIZE_PX);

    // Pipeline and loop definition
    /*
        UI --(pushes)--> dz segments in segmentArray --(pops several)--> Integral part for each dz ---> hsl to rgb on canvas
                 |                                           |                        |                         |             
                 |                                           |                        |                         |            
              line()                                       run()  --sync-----> calculateSegment()          repaintCanvas(), which sees what framerate the user sees
                                                                  --async--------------------------------->
                                                                  <-sync, with framerate information ------

        This loop stays active until there are no more segments
        to be calculated. The sync calls to calculateSegment()
        are made to target a smooth repaint framerate, while
        calculating the most segments possible.
        repaint() will activate the loop, in a singleton manner.
    */
    // shader definitions
    const identityVertexShader = getShader("vertex-shader-identity");
    const hslToRgbShader = getShader("fragment-shader-hsltorgb");
    const calcShader     = getShader("fragment-shader-calc");
    const hslToRgbProgram = getProgram(identityVertexShader, hslToRgbShader);
    const calcProgram     = getProgram(identityVertexShader, calcShader);
    createVertices();

    // Variable binding
    const zVec2  = gl.getUniformLocation(calcProgram, "u_z");
    const dzVec2 = gl.getUniformLocation(calcProgram, "u_dz");

    // pipeline usage
    let lastFrameOutput = 1;
    let needToRepaint = true;

    let calculateSegment = (currentPoint) => {
        // read-write swapping
        let currentTexture, currentFrameBuffer;
        if (lastFrameOutput === 1) {
            currentTexture = frame1.texture;
            currentFrameBuffer = frame0.frameBuffer;
            lastFrameOutput = 0;
        } else {
            currentTexture = frame0.texture;
            currentFrameBuffer = frame1.frameBuffer;
            lastFrameOutput = 1;
        }
        gl.bindTexture(gl.TEXTURE_2D, currentTexture);
        gl.bindFramebuffer(gl.FRAMEBUFFER, currentFrameBuffer);

        // bind segment, and draw
        gl.useProgram(calcProgram);
        gl.uniform2f(zVec2, currentPoint[0], currentPoint[1]);
        gl.uniform2f(dzVec2, currentPoint[2], currentPoint[3]);

        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 5);
        gl.flush();
        needToRepaint = true;

    }

    let lastRepaintDate = Date.now();
    let lastRepaintTime = 250;
    let smoothedLastRepaintTime = lastRepaintTime;
    const REPAINT_TIME_SMOOTHING_FACTOR = 0.95;
    repaintCanvas = () => {
        gl.useProgram(hslToRgbProgram);
        let currentTexture, currentFrameBuffer;
        if ( lastFrameOutput === 1 ) {
            currentTexture = frame1.texture;
            currentFrameBuffer = frame0.frameBuffer;
        } else {
            currentTexture = frame0.texture ;
            currentFrameBuffer = frame1.frameBuffer ;
        }
        gl.bindTexture(gl.TEXTURE_2D, currentTexture );
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 5);

        gl.flush();

        gl.bindFramebuffer(gl.FRAMEBUFFER, currentFrameBuffer);
        const pixels = new Float32Array(4);
        gl.readPixels(mouseLastOffsetX, gl.drawingBufferHeight - mouseLastOffsetY + 1, 1, 1, gl.RGBA, gl.FLOAT, pixels);
        const mouseValue = {re : pixels[0] / 2 / Math.PI, im : pixels[1] / 2 / Math.PI};
        document.getElementById('aValue').value =
            "Cursor  Re: " + fixedLengthDecimal(mouseValue.re, 2, 3) +
                  "  Im: " + fixedLengthDecimal(mouseValue.im, 2, 3);

        const now = Date.now();
        lastRepaintTime = now - lastRepaintDate;
        smoothedLastRepaintTime =
            smoothedLastRepaintTime * REPAINT_TIME_SMOOTHING_FACTOR +
            lastRepaintTime * (1 - REPAINT_TIME_SMOOTHING_FACTOR)
        lastRepaintDate = now ;
        needToRepaint = false;
        run();
    }

    let numberOfCalcCycles = 100;
    const MIN_CALC_CYCLES = 5;
    // 25Hz is a good target.
    const IDEAL_FRAME_TIME = 1000 / 25;
    const GPU_JITTER_SMOOTHING_FACTOR = 10;
    let running = false;
    let run = () => {
        running = true;

        if(needsToBeShuffled && document.getElementById('shuffle').checked) {
            shuffle();
            needsToBeShuffled = false;
        }

        numberOfCalcCycles = Math.min(
            segmentArray.length,
            Math.max(
                MIN_CALC_CYCLES,
                numberOfCalcCycles * ( 1 + ((IDEAL_FRAME_TIME - lastRepaintTime) / IDEAL_FRAME_TIME) / GPU_JITTER_SMOOTHING_FACTOR ) // adaptive
            )
        );
        document.getElementById('console').value = "Last duration: " + Math.round(smoothedLastRepaintTime) + "ms. Adding " + Math.floor(numberOfCalcCycles) + " cycles between frames. Segments left: " + segmentArray.length + ".";

        for(let i = 0 ; i < numberOfCalcCycles && segmentArray.length > 0 ; i++) {
            calculateSegment(segmentArray.pop());
        }
        if (needToRepaint) {
            window.requestAnimationFrame(repaintCanvas);
        } else {
            running = false;
        }
    }

    repaint = () => {
        if (!running) {
            run();
        }
    }

    // startup
    run();
}


// shapes
let line = (points) => {
    needsToBeShuffled = true;
    const ax = points[0];
    const ay = points[1];
    const bx = points[2];
    const by = points[3];

    const cx = (ax+bx)/2.0;
    const cy = (ay+by)/2.0;
    if (Math.abs(ax-bx) > drawPrecision()*2 || Math.abs(ay-by) > drawPrecision()*2 ) {
        line([ax, ay, cx, cy        ]);
        line([        cx, cy, bx, by]);
    } else {
        segmentArray.unshift([ cx, cy, bx-ax, by-ay ]);
    }
}
let rect = (ax, ay, sx, sy) => {
    line([ax   ,ay   ,ax+sx,   ay]);
    line([ax+sx,ay   ,ax+sx,ay+sy]);
    line([ax+sx,ay+sy,ax   ,ay+sy]);
    line([ax,   ay+sy,ax   ,ay   ]);
}
let circle = (ax, ay, r) => {
    const iMax = Math.ceil(2 * Math.PI * r / drawPrecision());
    let lastX = ax + r;
    let lastY = ay;
    for (let i = 0; i<=iMax; i++) {
        const theta = i / iMax * 2 * Math.PI;
        const newX = ax + r * Math.cos(theta);
        const newY = ay + r * Math.sin(theta);
        line([lastX,lastY,newX,newY]);
        lastX = newX;
        lastY = newY;
    }
}
let levyDragon = (ax, ay, bx, by ) => {
    if ( (Math.abs(ax-bx) > drawPrecision()*2 || Math.abs(ay-by) > drawPrecision()*2)) {
        const cx = ax - ( by - ay - bx + ax ) / 2;
        const cy = ay + ( by - ay + bx - ax ) / 2;
        levyDragon( ax, ay, cx, cy         );
        levyDragon(         cx, cy, bx, by );
    } else {
        line( [ax, ay, bx, by] );
    }
}
let shuffle = () => {
    for(let j, x, i = segmentArray.length;
        i;
        j = Math.floor(Math.random() * i),
        x = segmentArray[--i],
        segmentArray[i] = segmentArray[j],
        segmentArray[j] = x
    ) {}
}


// UI setup helpers
let mouseLastOffsetX = 1;
let mouseLastOffsetY = 1;
let mouseLastOffsetClickX = -1;
let mouseLastOffsetClickY = -1;
let isMouseDown = false;
let setupUI = (canvas) => {
    canvas.onmousedown = () => {isMouseDown = true;
        document.getElementById('debug').value = "onmousedown!";};
    canvas.touchstart  = canvas.onmousedown;
    canvas.onmouseup   = () => {isMouseDown = false;
        document.getElementById('debug').value = "onmouseup!";};
    canvas.touchend    = canvas.onmouseup;
    canvas.onmousemove = (e) => {
        e.preventDefault();
        if (e.touches) {
            var touch = e.touches[0] || e.changedTouches[0];
            var realTarget = document.elementFromPoint(touch.clientX, touch.clientY);
            e.offsetX = touch.clientX-realTarget.getBoundingClientRect().x;
            e.offsetY = touch.clientY-realTarget.getBoundingClientRect().y;
        }

        if (isMouseDown) {
            if (mouseLastOffsetClickX !== -1) {
                line([
                    mouseLastOffsetClickX / CANVAS_SIZE_PX, 1 - mouseLastOffsetClickY / CANVAS_SIZE_PX,
                    e.offsetX             / CANVAS_SIZE_PX, 1 - e.offsetY             / CANVAS_SIZE_PX
                ]);
                repaint();
            }
            mouseLastOffsetClickX = e.offsetX;
            mouseLastOffsetClickY = e.offsetY;
        } else {
            mouseLastOffsetClickX = -1;
        }

        mouseLastOffsetX = e.offsetX;
        mouseLastOffsetY = e.offsetY;
        if (segmentArray.length === 0) {
            window.requestAnimationFrame(repaintCanvas);
        }

        document.getElementById('debug').value = "onmousemove! " + e.offsetX + " " + e.offsetY;
    };
    canvas.ontouchmove = canvas.onmousemove;
}
let circleButton = () => {
    circle(0.5,0.5,0.25);
    repaint();
}
let squareButton = () => {
    rect(0.25,0.25,0.5,0.5);
    repaint();
}
const MIN_PRECISION_LEVY = -1;
let levyButton = () => {
    pixelPrecision = Math.max(pixelPrecision, MIN_PRECISION_LEVY);
    setPrecisionText();
    levyDragon(0.4 ,0.2, 0.8 , 0.6 );
    line( [.8, .6, .4, .2] );
    repaint();
}
let setPrecisionText = () => {
    let precisionText;
    if (pixelPrecision > 0) {
        precisionText = "" + 2 ** pixelPrecision;
    } else if (pixelPrecision === 0) {
        precisionText = "1";
    } else {
        precisionText = "1/" + 2 ** (-pixelPrecision);
    }
    document.getElementById('precision').value = "Precision: " + precisionText;
}
setPrecisionText();
let plusPrecision = () => {
    pixelPrecision++;
    setPrecisionText();
}
const MIN_PRECISION = -6;
let minusPrecision = () => {
    pixelPrecision--;
    pixelPrecision = Math.max(pixelPrecision, MIN_PRECISION);
    setPrecisionText();
}
let fixedLengthDecimal = (v, left, right) => {
    return (v < 0 ? '-' : '+') + Math.abs(v).toFixed(right).padStart(left + right + 1, '0');
}



// GL setup helpers
let getGl = (canvas) => {
    // init WebGL with floating point operations
    let result;
    try {
        result = canvas.getContext("webgl") || canvas.getContext("experimental-webgl", {preserveDrawingBuffer: true});
    } catch(e) {
        console.log("Problem loading WebGL"); 
        console.log(e.toString()); 
    }
    result.getExtension("OES_texture_float");
    result.getExtension("OES_texture_float_linear");
    return result;            
}

let createFrame = (size) => {
    // init frameBuffers, associated with textures
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);        
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, size, size, 0, gl.RGBA, gl.FLOAT, null);
    
    const frameBuffer = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, frameBuffer);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
    return { texture:texture, frameBuffer:frameBuffer };
}

let getShader = (nodeId) => {
    const shaderSourceNode = document.getElementById(nodeId);
    const shader = gl.createShader(shaderSourceNode.type === "x-shader/x-vertex" ? gl.VERTEX_SHADER : gl.FRAGMENT_SHADER );
    gl.shaderSource(shader, shaderSourceNode.firstChild.textContent);
    gl.compileShader(shader);
    console.log(nodeId +" compile status: " + gl.getShaderParameter(shader, gl.COMPILE_STATUS));
    return shader;
}

let getProgram = (vertexShader, fragmentShader) => {
    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    console.log("Program link status: " + gl.getProgramParameter(program, gl.LINK_STATUS));
    return program;
}

// ~noop
let createVertices = () => {
    gl.enableVertexAttribArray(0);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    const vertices = [ -1., -1., 1., -1., 1., 1., -1., 1., -1., -1. ];
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
}


// weird examples

// b/w alternate
// drawPrecision = () => 10.0;
/*
for ( var i = -10 ; i < 11 ; i++ ) {
    line([0.0+(i-0.25)/5.0,0.0+(i-0.25)/5.0,1.0+(i-0.25)/5.0,1.0+(i-0.25)/5.0]);
    line([1.0+(i+0.25)/5.0,1.0+(i+0.25)/5.0,0.0+(i+0.25)/5.0,0.0+(i+0.25)/5.0]);
}
*/


/*
// zipped line with parabolas
// drawPrecision = () => 10.0;
for ( var i = -10 ; i < 11 ; i++ ) {
    line([0.0+(i-0.25)/50.0,0.0+(i-0.25)/50.0,1.0+(i-0.25)/50.0,1.0+(i-0.25)/50.0]);
    line([1.0+(i+0.25)/50.0,1.0+(i+0.25)/50.0,0.0+(i+0.25)/50.0,0.0+(i+0.25)/50.0]);
}
*/


// zip zoom
/*
drawPrecision = () => 10.0;
for ( var i = -10 ; i < 11 ; i++ ) {
    line([0.0+(i-0.25)/5.0,0.0-(i-0.25)/5.0,1.0+(i-0.25)/5.0,1.0-(i-0.25)/5.0]);
    line([1.0+(i+0.25)/5.0,1.0-(i+0.25)/5.0,0.0+(i+0.25)/5.0,0.0-(i+0.25)/5.0]);
}
*/


/*
// separation coloree
drawPrecision = () => 10.0;
for ( var i = -10 ; i < 11 ; i++ ) {
    line([0.0+i/5.0,0.0-i/5.0,1.0+i/5.0,1.0-i/5.0]);
}
*/



/*
// nice diagonals
drawPrecision = () => 10.0;
for ( var i = -10 ; i < 11 ; i++ ) {
    line([0.0+i/25.0,0.0+i/25.0,1.0+i/25.0,1.0+i/25.0]);
}
*/

/*
// diagonal balls
drawPrecision = () => 10.0;
for ( var i = -10 ; i < 11 ; i++ ) {
    line([0.0+i/10.0,0.0+i/10.0,1.0+i/10.0,1.0+i/10.0]);
}
*/

/*
// funny balls extension
drawPrecision = () => 0.1;
//drawPrecision = () => 10.0;
for ( var i = -2 ; i < 2 ; i++ ) {
    line([0.05+i/10.0,0.05+i/10.0,1.05+i/10.0,1.05+i/10.0]);
}
*/

/*
// funny ball
drawPrecision = () => 10.0;
line([-0.05,-0.05,0.95,0.95]);
line([ 0.05, 0.05,1.05,1.05]);
*/


// rounding errors zoom, patterns fun
// precision 10000000
// rounding debut à 200
// rounding exemple à 2000
// pattern fun à 20000
// 200000 on zoome sur les cercles concentriques puis les patterns complesxes centraux apparaissent 
/*
drawPrecision = () => 1.0;
for ( var i = 201 ; i>0 ; i-- ) {
    line([1.0,1.0,0.0,0.0]);
}
line([-100.0,-100.0,101.0,101.0]);
*/


/*
// creep lumineux
// avec précision 0.05
drawPrecision = () => 0.05;
document.getElementById('shuffle').checked = false;
for ( var i = 40 ; i>0 ; i-- ) {
    rect(0.5-i/80,0.5-i/80,i/40,i/40);
}
*/


/*
// flux à droite
// avec précision 0.05
drawPrecision = () => 0.05;
document.getElementById('shuffle').checked = false;
for ( var i = 120 ; i>0 ; i-- ) {
    circle(i/30,0.5,i/40);
}
*/
