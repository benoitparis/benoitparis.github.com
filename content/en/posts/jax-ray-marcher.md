---
title: "JAX's true calling: Ray-Marching renderers on WebGL"
date: 2025-04-01T18:00:00+02:00
---

# JAX's true calling: Ray-Marching renderers in Python on WebGL

## Demo

(move your mouse/thumb across the image)

{{< partial "custom/jaxraytracer/index.html" >}}

## Why, though?

Well, I've been drooling over this tool the cool kids use, and wondering how I can join the gang. It's called [JAX](https://docs.jax.dev/en/latest/).

It's got GPU accelerated functions over n-dimensional arrays. And built-in compile-time differentiability of
these!? Auto-vectorization?? And you just have to do like with numpy. What's not to like? Go home APL! So I've been doing the obvious, the thing JAX was
truly meant for: a graphics renderer.

Why, do you ask? Well, the animated image above is a 3-dimensional [512 pixels][512 pixels][3 colors] array for starters
(or tensor, if you like). And we can define its content from the output of a function. 
Start from mouse position and time input, plug in some maths, hard-code a sphere and a cube in there, and voilà, pixels are painted!

[And for our first trick here is the code](https://github.com/benoitparis/jax-raytracer), at about just 100 lines of _Python_. Yes, Python for browser code, because [JAX can also be exported and run on the browser. On WebGL](https://github.com/tensorflow/tfjs/blob/master/tfjs-converter/README.md).

Below are some of the techniques used and where JAX shines:

## Distances

[We won't be drawing polygons here](https://en.wikipedia.org/wiki/Polygon_mesh). We'll be using [Signed Distance Functions (SDF)](https://en.wikipedia.org/wiki/Signed_distance_function). These have a lot going for them:

* They're just beautiful. What's a sphere but a distance to a point? What's a cylinder but a distance to a line? Just define a function to be negative when inside an object, positive outside. 

* They're composable. Want the union of two objects? You take the minimum of their SDF. Want the intersection? max() it is. [Here is a non-exhaustive list of what you can do](https://iquilezles.org/articles/distfunctions/). Here, we'll be using [smooth version of a union](https://iquilezles.org/articles/smin/), as we want to preserve differentiability. If we had wanted the intersection, we could have used something akin to a softmax (I'm told this is a trendy function at the moment).

* They contain help for moving in space without colliding with the shape they represent. By definition if the closest point to an object is a length L away from you, then you can move by length L in any direction you like without hitting it. That's [the raymarching / sphere tracing  algorithm](https://en.wikipedia.org/wiki/Ray_marching#Distance-aided_ray_marching).

* Did I mention they're functions? We can vectorize these! Using two invocations of JAX's `vmap`, we can transform functions assigned to single pixels into
  functions that compute all pixels of an image in parallel:

{{< highlight python >}}
ray_colors = jax.vmap(jax.vmap(ray_color, (None, 0, None)), (0, None, None))
{{< /highlight >}}


And last but not least, our final trick:
 
* The [gradient](https://en.wikipedia.org/wiki/Gradient) of the SDF is the normal to the surface. With differentiability, and just one keyword light can be [diffused](https://en.wikipedia.org/wiki/Diffuse_reflection) or [reflected](https://en.wikipedia.org/wiki/Reflection_(physics)#/media/File:Reflection_angles.svg). _And do it at compile-time_. No more run-time [epsilon trickery (lines 74-81 here)](https://www.shadertoy.com/view/MsBGW1). Mmmh, mathematical purity. A one-liner:


{{< highlight python >}}
normal_at_surface = jax.grad(distance_function)(point_at_surface)
{{< /highlight >}}

## <3 Mechanical-sympathy for maths!

Now Google probably did not decide to build JAX so that I could personally save a few keystrokes on this. But the primitives available make it so that the code can be 70% maths. It is a nice step in having higher level DSLs be almost math-like, while staying very close to the metal.

---

Addendum: Things I would have liked to try but did not have time to:
* [jax-js](https://jax-js.com/): It has WebGPU support
* [JAXGA - JAX Geometric Algebra](https://github.com/RobinKa/jaxga): SDFs and 3D in general just beg to be expressed in terms of Projective Geometry. And we'd probably get Conformal Geometry for free as well.
* Visualize the relation between Neural Networks and 3D/SDFs. Dense layers are basically a bunch of half-hyperplane SDFs that are hard-bounded (ReLU, creating polytopes) or soft-intersected (Softmax, creating potatoïds)
* [jax.experimental.jet](https://docs.jax.dev/en/latest/jax.experimental.jet.html): Apparently [we can get Taylor expansions of functions](https://medium.com/@andrey.yachmenev_75311/high-order-derivatives-using-jax-taylor-mode-automatic-differentiation-27c63be6ace9). Can this help at compile-time the ray-marching process, similarly to [Ray Tracing for Harmonic Functions](https://markjgillespie.com/Research/harnack-tracing/index.html)?