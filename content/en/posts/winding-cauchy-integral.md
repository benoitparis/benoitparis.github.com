---
title: "Winding numbers using a Cauchy integral, with WebGL"
date: 2022-08-24T15:53:54+02:00
---

# Winding numbers using a Cauchy integral, with WebGL

This is what the [winding number](https://en.wikipedia.org/wiki/Winding_number) {{< unsafe >}}<mjx-container class="MathJax CtxtMenu_Attached_0" jax="CHTML" tabindex="0" ctxtmenu_counter="0" style="font-size: 113.1%; position: relative;"><mjx-math class="MJX-TEX" aria-hidden="true"><mjx-mi class="mjx-i"><mjx-c class="mjx-c1D45B TEX-I"></mjx-c></mjx-mi><mjx-mo class="mjx-n"><mjx-c class="mjx-c28"></mjx-c></mjx-mo><mjx-mi class="mjx-i"><mjx-c class="mjx-c1D6FE TEX-I"></mjx-c></mjx-mi><mjx-mo class="mjx-n"><mjx-c class="mjx-c2C"></mjx-c></mjx-mo><mjx-mi class="mjx-i" space="2"><mjx-c class="mjx-c1D44E TEX-I"></mjx-c></mjx-mi><mjx-mo class="mjx-n"><mjx-c class="mjx-c29"></mjx-c></mjx-mo></mjx-math><mjx-assistive-mml unselectable="on" display="inline"><math xmlns="http://www.w3.org/1998/Math/MathML"><mi>n</mi><mo stretchy="false">(</mo><mi>γ</mi><mo>,</mo><mi>a</mi><mo stretchy="false">)</mo></math></mjx-assistive-mml></mjx-container>{{< /unsafe >}} of curve {{< unsafe >}}<mjx-container class="MathJax CtxtMenu_Attached_0" jax="CHTML" tabindex="0" ctxtmenu_counter="1" style="font-size: 113.1%; position: relative;"><mjx-math class="MJX-TEX" aria-hidden="true"><mjx-mi class="mjx-i"><mjx-c class="mjx-c1D6FE TEX-I"></mjx-c></mjx-mi></mjx-math><mjx-assistive-mml unselectable="on" display="inline"><math xmlns="http://www.w3.org/1998/Math/MathML"><mi>γ</mi></math></mjx-assistive-mml></mjx-container>{{< /unsafe >}} around point {{< unsafe >}}<mjx-container class="MathJax CtxtMenu_Attached_0" jax="CHTML" tabindex="0" ctxtmenu_counter="3" style="font-size: 113.1%; position: relative;"><mjx-math class="MJX-TEX" aria-hidden="true"><mjx-mi class="mjx-i"><mjx-c class="mjx-c1D44E TEX-I"></mjx-c></mjx-mi></mjx-math><mjx-assistive-mml unselectable="on" display="inline"><math xmlns="http://www.w3.org/1998/Math/MathML"><mi>a</mi></math></mjx-assistive-mml></mjx-container>{{< /unsafe >}}, expressed as special case of [Cauchy's integral formula](https://en.wikipedia.org/wiki/Cauchy%27s_integral_formula) looks like on potentially non-closed loops, with complex numbers mapped to a hue-luminance space.

$$ n(\gamma ,a) = \frac{1}{2 \pi i}\int_{\gamma}^{}\frac{1}{z-a}dz $$

## Demo

(drag your mouse across the red canvas)

{{< partial "custom/winding/index.html" >}}

Each pixel displays its complex winding number: Real part as Hue, Imaginary part as Luminance. Curves can be drawn with mouse dragging, some predefined shapes are available.

## The formula

Along the way to proving [Cauchy’s Integral Formula](https://en.wikipedia.org/wiki/Cauchy%27s_integral_formula), there's this winding number which I found remarquable. 
Out of seemingly innocuous operations on complex numbers it always outputs a real integer number; And it mysteriously is the number of turns a curve takes around a point! But the curve has to be closed.

Do not ask me to intuitively explain why it does that. In fact, I built this visualization to tinker with that formula and investigate. [You can go over there to try to make sense of it](https://math.stackexchange.com/questions/4054/intuitive-explanation-of-cauchys-integral-formula-in-complex-analysis).

But what if you don't close the loop? Turns out the formula outputs 'undefined', in the form of a complex part to the winding number. One area is positive (high luminance) if it had too much 'going to' and negative (low luminance) if too little. To make the canvas mostly Real, you want to go from areas in need of 'going to' to areas that have too much of it, closing the loops! So the formula even comes with a debug function.

Of note is that the inverse of a curve is the same curve going backwards: same integral, replace $dz$ by $-dz$. Also integrating (~summing, here) is commutative and can be made in any order; this is the shuffle option. 

This means you can split a bigger curve in two by adding a back and forth between two points on it, re-arranging the integrals. It is equivalent to identity, as you just added a curve and its inverse. And vice versa: merge two compatible smaller curves into a bigger one.

{{< figure src="/shape-splitting.png" caption="Sort of, minus the visual glitches" >}}

## Visual glitches

Precision can be tuned so that smaller or bigger $dz$ are used. A finer precision will give smaller black-white dottings, more integration accuracy, and lower speed; but you may also experience higher float loss accumulation.

On mobile you'll probably experience inaccurate winding numbers: non-smooth colors inside closed loops. This is due to intermediate results being written to float textures, and [WebGL on mobile often only has 4 bits per channel when desktop offers 16 bits](https://webglfundamentals.org/webgl/lessons/webgl-precision-issues.html#texture-formats).

## Code

[Here](https://github.com/benoitparis/winding-contour-cauchy)

## Building it 

Well, if you want a ~500x500 pixel canvas for a curve of about 1000 elements that's already 250 million operations; so this gives a great opportunity to use the GPU.

I use two [`fragment shaders`](https://www.khronos.org/opengl/wiki/Fragment_Shader). One for projecting the real and imaginary parts -which I store as the red and green channels in a texture- onto a hue-saturation-luminance space. I chose hue for the real part as it illustrates about the 'nature' of the output; while we want some king of fading out of this clear result when we get too imaginary. So luminance for the imaginary part, and saturation is constant. Hue is scaled in order that a round number of windings (12) gets you back to red.

The other `fragment shader` contains the formula, and I switch back and forth between reading and writing to two textures to accumulate the sum. Programming in [glsl](https://en.wikipedia.org/wiki/OpenGL_Shading_Language)/WebGL feels refreshingly simple with its [SIMD](https://en.wikipedia.org/wiki/Single_instruction,_multiple_data) nature. In goes a single (x,y) pixel coordinate, and the programmer is tasked with defining what the outgoing color for this single pixel is:

{{< highlight glsl >}}
void main(void) {                                                
    vec2 a = gl_FragCoord.xy / 512.0;                  # scale xy
    vec2 prev = texture2D(u_calcSamp, a).xy;           # fetch previous value
                                                       # compute Cauchy formula
    vec2 delta = a - u_z;                              
    float denom = dot(delta, delta);                          
    gl_FragColor = vec4(                                        # output is rgba
        prev.x + (delta.x * u_dz.y - delta.y * u_dz.x) / denom, # real in red
        prev.y + dot(delta, u_dz) / denom,                      # imaginary in green
        1.0,                                                    
        1.0                                                     
    );
}
{{< /highlight >}}

If you want to start tinkering with glsl/WebGL, I highly recommend you checkout [Shadertoy](https://www.shadertoy.com/).

I also monitor time between animation frames, and cram in as many calculation cycles as possible while trying to maintain at most 40 ms between frames.

And that's about all there is to it; the rest is glue code, UI, and basic features.

----