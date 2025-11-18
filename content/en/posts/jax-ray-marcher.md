---
title: "A Python WebGL Ray-Marcher, using JAX"
date: 2024-08-12T12:53:54+02:00
---

# A Python WebGL Ray-Marcher, using JAX and TensorFlow.js

## Demo

(move your mouse/thumb across the image)

{{< partial "custom/jaxraytracer/index.html" >}}
     
## Why, though?

Well, I've been drooling over this tool the cool kids use, and wondering how I can join the gang. It's called JAX.

It's got GPU accelerated functions over n-dimensional arrays. And built-in compile-time differentiability of
these!? Auto-vectorization?? And you just have to do like with numpy. What's not to like? Go home APL! So I've been doing the obvious, the thing JAX was
truly meant for: a graphics renderer.

Why, do you ask? Well, the image above is a 3-dimensional [512 pixels][512 pixels][3 colors] array for starters
(or tensor, if you like). And we can define its content from the output of a function. 
Start from mouse position and time input, plug in some maths, hard-code some a sphere and a cube in there, and voilà, pixels are painted!

[And for our first trick here is the code](https://github.com/benoitparis/jax-raytracer), at about just 100 lines of _Python_. Yes, Python for browser code, because [JAX can also be exported and ran on the browser. On WebGL](https://github.com/tensorflow/tfjs/blob/master/tfjs-converter/README.md).

Below is a walkthrough of the techniques employed, and where JAX shines:

## Distances

[We won't be drawing polygons here](https://en.wikipedia.org/wiki/Polygon_mesh). We'll be using [Signed Distance Functions (SDF)](https://en.wikipedia.org/wiki/Signed_distance_function). These have a lot going for them:


They're just beautiful. What's a Sphere but a distance to a point? What's a Cylinder but a distance to a line? Just define a function to be negative when inside an object, positive outside. 

They're composable. Want the union of two objects? You take the minimum of their SDF. Want the intersection? max() it is. [Here is a list of what you can do](https://iquilezles.org/articles/distfunctions/). Here, we'll be using [smooth version of a union](https://iquilezles.org/articles/smin/), as we want differentiability.

They contain help for moving in space without colliding the shape they represent. By definition if the closest point to an object is a length L away from you, then you can move by length L in any direction you like without colliding the object. That's [the raymarching / sphere tracing  algorithm](https://en.wikipedia.org/wiki/Ray_marching#Distance-aided_ray_marching).

Did I mention they're functions? We can vectorize these! Using two invocations of JAX's `vmap`, we can transform functions assigned to single pixels into
  functions that compute all pixels in parallel. Batching away numbers in the right SIMD sizes.

{{< highlight python >}}
ray_colors = jax.vmap(jax.vmap(ray_color, (None, 0, None)), (0, None, None))
{{< /highlight >}}


And last but not least, our last trick:

* The [Gradient](https://en.wikipedia.org/wiki/Gradient) of the SDF is the normal to the surface. With differentiability, and just one keyword you'll be able to [diffuse](https://en.wikipedia.org/wiki/Diffuse_reflection) or [reflect light](https://en.wikipedia.org/wiki/Reflection_(physics)#/media/File:Reflection_angles.svg). _And do it at compile-time_. No more [epsilon trickery](https://www.shadertoy.com/view/MsBGW1). Mmmh, mathematical purity. Here is what it looks like in the code:


{{< highlight python >}}
normal_at_surface = jax.grad(distance_function)(point_at_surface)
{{< /highlight >}}

## We want mechanical-sympathy maths

Now Google probably did not decide to build JAX so that I could save a few keystrokes on this. But it's still mathematically beautiful. And a nice step in having higher level languages, almost math-like, that stay quite close to the metal.

