---
title: "Winding numbers using a Cauchy integral formula with WebGL"
date: 2022-08-24T15:53:54+02:00
---

This what the [winding number](https://en.wikipedia.org/wiki/Winding_number) $n(\gamma ,a)$ of curve $\gamma$ around point $a$, expressed as special case of [Cauchy's integral formula](https://en.wikipedia.org/wiki/Cauchy%27s_integral_formula) looks like on potentially-non-closed loops, with complex numbers mapped to a hue-luminance space.

$$ n(\gamma ,a) = \frac{1}{2 \pi i}\int_{\gamma}^{}\frac{1}{z-a}dz $$

## Demo:




{{< partial "custom/winding/index.html" >}}


note comme quoi sur mobile ça marche pas because on utilise des textures pour stoquer les valeurs
  et que celles ci sont 4 bits sur mobile, 16 bits sur desktop
    https://webglfundamentals.org/webgl/lessons/webgl-precision-issues.html#texture-formats

bien expliciter que a c'est chaque pixel, 
  qu'on peut hover pour avoir la valeur
  qu'on peut drag pour faire une ligne et que cette ligne c'est gamma, avec z la position au moment de drag et dz un micro segment qu'on peut spécifier avec la précision, et que c'est une somme, hein, on fait pas les choses analytiquement

donner un lien vers le nouveau repo que tu va utiliser


Calculating the Winding number with Cauchy With WebGL 

<Play with it>



a line integral cauchy formula

Lines compose: closing a line on itself can be done randomly, or at a later time
Partir de la formule et voir les symétries

There's a multitude of ways to put things on the real plane: like a multitude of ways to reach point A from B

Closed forms which share a border going on the other direction can form a bigger structure
corrolary: you can split a bigger closed loop into 2, and conserve the realness


explain a bit the buttons

Story time!

n(\gamma ,a) = \frac{1}{2 \pi i}\int_{\gamma}^{}\frac{1}{z-a}dz

  In prepa schools, in proving Cauchy’s Integral Formula[wiki link], there's this winding number, 
    which I always found remarquable: out of seemingly continuous operators outputs a discreet number!
    and it gives just the right amount of loops the curve goes around
    it always outputs an integer on a closed loop, but what if the loop is not closed
    also, complex numbers are two dimensionalm but we can find a space to display that
    we need to do large summation: we have a 2 dimensional here 500x500, and we may want loops that are describe by about 1000 pixels in that space
    so that's 250M divisions to do (we consider that summation and substracting are free compared to dividing). other than constant propagation, we did not try to use other mathematical tricks and just brute-forced the problem
    So we need a GPU. (disclaimer alt: I did it first on a CPU and it was slow)
  Defining a color space
    we want real to be different from each other, in kind, and be clear from other numbers that have an imaginary part
    so let's assign hue to real part, and luminance for im part (black for neg, white for pos)
  



EN EN EN

nkfdskjfdshkfdsl

dsadsas



## Blah 2

## Blah 3