
#promotion
TODO: promote: en parler à #Blue1Brown, ou bien autres podcasts ou videos qui parlent de line integral / cauchy
TODO: mettre du GA

#actionability
TODO: passer les funny machins en boutons
TODO: pouvoir scripter les choses: passer les boutons dans une console?
TODO: pouvoir share le script par internet, dans un http:.....#fhdkhfsdkkf

#finish
TODO: write the post
TODO: have a blog
TODO: embed it
TODO: promote it
TODO: tester sur ff, sur mobile

#tech
TODO: flatten loops
TODO: pointer location value
  https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/readPixels
TODO: color map, with current pointer location
TODO: color map, with histogram
should be a line for when things are real
should be a segment from orange to red, going up and down
a circle?
-> circles are lines, and lines are circles??
some kind of duality
un opener au moins, avant de impl

#math
TODO: faire f(z)/z-a, avec le parseur de fonction complexe que tu a déjà pu voir par ailleurs
TODO: preuve que ça fait des nombres entiers
TODO: et intersections de closed loops: on fait des cercles!

https://math.mit.edu/~jorloff/18.04/notes/topic4.pdf
  connaitre sur la border c'est connaitre sur le point

https://direns.mines-paristech.fr/Sites/Complex-analysis/The%20Winding%20Number/#theorem--continuous-choice-of-the-argument.
  "winding number

https://mathweb.ucsd.edu/~jmckerna/Teaching/14-15/Autumn/220A/"
  cf l_13 et l_14

#link, output
I like to build vizual explanations or illustrations for complex things, to provide me and others with inspiring insights maybe
  complex data (explicable.ai)
  math ()
  etc


-----

Calculating the Winding number with Cauchy With WebGL 

<Play with it>

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
  




