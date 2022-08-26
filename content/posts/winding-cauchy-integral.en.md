---
title: "Winding numbers using a Cauchy integral, with WebGL"
date: 2022-08-24T15:53:54+02:00
---

This what the [winding number](https://en.wikipedia.org/wiki/Winding_number) {{< unsafe >}}<mjx-container class="MathJax CtxtMenu_Attached_0" jax="CHTML" tabindex="0" ctxtmenu_counter="0" style="font-size: 113.1%; position: relative;"><mjx-math class="MJX-TEX" aria-hidden="true"><mjx-mi class="mjx-i"><mjx-c class="mjx-c1D45B TEX-I"></mjx-c></mjx-mi><mjx-mo class="mjx-n"><mjx-c class="mjx-c28"></mjx-c></mjx-mo><mjx-mi class="mjx-i"><mjx-c class="mjx-c1D6FE TEX-I"></mjx-c></mjx-mi><mjx-mo class="mjx-n"><mjx-c class="mjx-c2C"></mjx-c></mjx-mo><mjx-mi class="mjx-i" space="2"><mjx-c class="mjx-c1D44E TEX-I"></mjx-c></mjx-mi><mjx-mo class="mjx-n"><mjx-c class="mjx-c29"></mjx-c></mjx-mo></mjx-math><mjx-assistive-mml unselectable="on" display="inline"><math xmlns="http://www.w3.org/1998/Math/MathML"><mi>n</mi><mo stretchy="false">(</mo><mi>γ</mi><mo>,</mo><mi>a</mi><mo stretchy="false">)</mo></math></mjx-assistive-mml></mjx-container>{{< /unsafe >}} of curve {{< unsafe >}}<mjx-container class="MathJax CtxtMenu_Attached_0" jax="CHTML" tabindex="0" ctxtmenu_counter="1" style="font-size: 113.1%; position: relative;"><mjx-math class="MJX-TEX" aria-hidden="true"><mjx-mi class="mjx-i"><mjx-c class="mjx-c1D6FE TEX-I"></mjx-c></mjx-mi></mjx-math><mjx-assistive-mml unselectable="on" display="inline"><math xmlns="http://www.w3.org/1998/Math/MathML"><mi>γ</mi></math></mjx-assistive-mml></mjx-container>{{< /unsafe >}} around point {{< unsafe >}}<mjx-container class="MathJax CtxtMenu_Attached_0" jax="CHTML" tabindex="0" ctxtmenu_counter="3" style="font-size: 113.1%; position: relative;"><mjx-math class="MJX-TEX" aria-hidden="true"><mjx-mi class="mjx-i"><mjx-c class="mjx-c1D44E TEX-I"></mjx-c></mjx-mi></mjx-math><mjx-assistive-mml unselectable="on" display="inline"><math xmlns="http://www.w3.org/1998/Math/MathML"><mi>a</mi></math></mjx-assistive-mml></mjx-container>{{< /unsafe >}}, expressed as special case of [Cauchy's integral formula](https://en.wikipedia.org/wiki/Cauchy%27s_integral_formula) looks like on potentially-non-closed loops, with complex numbers mapped to a hue-luminance space.


$$ n(\gamma ,a) = \frac{1}{2 \pi i}\int_{\gamma}^{}\frac{1}{z-a}dz $$

## Demo

(drag your mouse on the red canvas, try to close loops)

{{< partial "custom/winding/index.html" >}}

Each pixel displays its winding number; hovering over it displays the real (Re) and imaginary (Im) part. Curves can be drawn with mouse dragging, some predefined shapes are available.

## The formula

In French math preparatory school, along the way to proving [Cauchy’s Integral Formula](https://en.wikipedia.org/wiki/Cauchy%27s_integral_formula), there's this winding number which I always found remarquable.
Out of seemingly innocuous operations on complex numbers it outputs a real integer number! And to top it mysteriously is the number of turns a curve takes around a point. But the curve has to be closed.

Do not ask me to intuitively explain why it does that. In fact, I built this visualization to tinker with that formula and investigate. [You can go over there to try to make sense of it](https://math.stackexchange.com/questions/4054/intuitive-explanation-of-cauchys-integral-formula-in-complex-analysis).

But what if you don't close the loop? Turns out the formula outputs 'undefined', in the form of a complex part to the winding number. One part is positive (high luminance) if the curve has too much 'going to' and negative (low luminance) if not. To make the canvas mostly real, you may want to go from areas in need of 'going to' to areas that have too much of it, closing the loops!

Of note is that the inverse of a curve is the same curve going backwards: same integral, replace $dz$ by $-dz$. Also integrating (~summing, here) is commutative, can be made in any order; this is the shuffle option. 

This means you can split a bigger curve in two by adding a back and forth between two points on it and re-arranging the integrals. It is equivalent to identity, as you just added a curve and its inverse. And also merge two compatible smaller curves into a bigger one.

{{< figure src="/shape-splitting.png" caption="Sort of, minus the artefacts" >}}

## Artefacts

Precision can be tuned so that smaller or bigger $dz$ are used. You'll see smaller 'black-white dotting', but may experience higher integration loss accumulation.

On mobile you'll probably experience inaccurate winding numbers: non-smooth colors inside closed loops. This is due to intermediate results being written to float textures, and [WebGL on mobile often only has 4 bits per channel when desktop offers 16 bits](https://webglfundamentals.org/webgl/lessons/webgl-precision-issues.html#texture-formats).

big dz

play with it enough, and you'll get Re like 100.1

## Code

[here](https://github.com/benoitparis/winding-contour-cauchy)

## Building it 

Well, if you want a ~500x500 pixel canvas for a curve of about 1000 elements that's already 250 million operations; so this gives a great opportunity to use the GPU.

I use two [fragment shaders](https://www.khronos.org/opengl/wiki/Fragment_Shader). One for projecting the real and imaginary parts -which I store as red and green in a texture- onto a hue-saturation-luminance space. I chose hue for the real part as it illustrates about the 'nature' of the output; as we want some king of fading out of this clear result when we get too imaginary. So luminance for the imaginary part, and saturation is constant.

The other fragment shader contains the formula, and I switch back and forth between two textures for summing up the result. Programming in WebGL is refreshingly simple once one understand its [SIMD](https://en.wikipedia.org/wiki/Single_instruction,_multiple_data) nature: In goes a single (x,y) coordinate, and the programmer is tasked with defining what the outgoing color for this single pixel is:

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

If you want to start tinkering with WebGL, I highly recommend you checkout [Shadertoy](https://www.shadertoy.com/).

I also monitor time between animation frames, and try to cram as many cycles as I can while targeting 40 ms/frame.

And really that's all there is to it; the rest is glue code, UI, and basic features.


----

bien expliciter que a c'est chaque pixel, 
  qu'on peut hover pour avoir la valeur
  qu'on peut drag pour faire une ligne et que cette ligne c'est gamma, 
    avec z la position au moment de drag et dz un micro segment qu'on peut spécifier avec la précision, 
    et que c'est une somme, hein, on fait pas les choses analytiquement

Lines compose: closing a line on itself can be done randomly, or at a later time
Partir de la formule et voir les symétries

There's a multitude of ways to put things on the real plane: like a multitude of ways to reach point A from B

Closed forms which share a border going on the other direction can form a bigger structure
corrolary: you can split a bigger closed loop into 2, and conserve the realness

Disqus comments??