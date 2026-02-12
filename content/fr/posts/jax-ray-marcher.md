---
title: "Un Ray-Marcher WebGL en Python, avec JAX"
date: 2024-08-12T12:53:54+02:00
---

# Un Ray-Marcher WebGL en Python, avec JAX et TensorFlow.js


## Démo

(bougez votre souris/pouce sur l'image)

{{< partial "custom/jaxraytracer/index.html" >}}
     
## Mais pourquoi donc ?

Il y a cet outil que les gens cool utilisent, et je me demandais comment je pourrais faire partie du club. L'outil, c'est JAX.

Ça accélère des fonctions sur des arrays à n dimensions, sur GPU. Et avec différentiabilité intégrée au moment de la compilation de celles-ci !? Avec l'auto-vectorisation en prime ?? Et il suffirait de faire comme avec numpy ? Qu'est-ce qu'on peut lui demander de plus ? Rentre chez toi APL !

Si vous faites du Machine Learning avec JAX, vous avez tort. J'ai réalisé ici la vraie raison d'être de JAX, ce pour quoi il a été
réellement conçu: un moteur de rendu graphique.

Pourquoi, me demandez-vous ? Eh bien, l'image ci-dessus est tout bonnement un tableau à 3 dimensions [512 pixels][512 pixels][3 couleurs] (ou un tenseur, si vous préférez). Et nous pouvons définir son contenu à partir de la sortie d'une fonction.
Partez de la position de la souris et d'un indicateur de temps, ajoutez des maths, invoquez en dur une sphère et un cube là-dedans ; et voilà, chaque pixel aura une couleur !

Et pour notre premier tour de magie, [voici le code de la démo ci-dessus](https://github.com/benoitparis/jax-raytracer); en seulement environ 100 lignes de _Python_. Oui, du Python pour du code navigateur, car [JAX peut aussi être exporté et exécuté dans le navigateur. Sur WebGL](https://github.com/tensorflow/tfjs/blob/master/tfjs-converter/README.md).

Ci-dessous les méthodes employées, et là où JAX brille.

## Distances

[Nous ne dessinerons pas avec des polygones](https://en.wikipedia.org/wiki/Polygon_mesh). Nous utiliserons des [Fonctions de Distance Signée (SDF)](https://en.wikipedia.org/wiki/Signed_distance_function). Elles ont beaucoup d'atouts :

* Elles sont juste magnifiques. Qu'est-ce qu'une sphère sinon qu'une distance à un point ? Qu'est-ce qu'un cylindre sinon qu'une distance à une ligne ? Il suffit de définir une fonction qui soit négative à l'intérieur d'un objet, positive à l'extérieur.

* Elles sont composables. Vous voulez l'union de deux objets ? Prenez le minimum de leurs SDF. Vous voulez l'intersection ? C'est max(). [Voici une liste non-exhaustive de ce qui est possible](https://iquilezles.org/articles/distfunctions/). Ici, nous utiliserons [la version lisse d'une union](https://iquilezles.org/articles/smin/), car nous voulons de la différentiabilité.

* Elles contiennent de l'aide pour se déplacer dans l'espace sans heurter la forme qu'elles représentent. Par définition, si le point le plus proche d'un objet est à une distance L de vous, alors vous pouvez vous déplacer d'une longueur L dans n'importe quelle direction sans heurter l'objet. C'est [l'algorithme de raymarching / sphere tracing](https://en.wikipedia.org/wiki/Ray_marching#Distance-aided_ray_marching).

* Ai-je mentionné que ce sont des fonctions ? Nous pouvons les vectoriser ! Deux appels à `vmap` de JAX transformera une fonction assignée à un pixel en une fonction pour tous les pixels; en parallèle:

{{< highlight python >}}
ray_colors = jax.vmap(jax.vmap(ray_color, (None, 0, None)), (0, None, None))
{{< /highlight >}}


Et enfin, mais non des moindres, notre dernière astuce:

* Le [gradient](https://en.wikipedia.org/wiki/Gradient) de la SDF est la normale à la surface. Avec la différentiabilité, `grad` permettra facilement de [diffuser](https://en.wikipedia.org/wiki/Diffuse_reflection) ou [réfléchir la lumière](https://en.wikipedia.org/wiki/Reflection_(physics)#/media/File:Reflection_angles.svg). _Et le faire à la compilation_. Plus de méthode des différences d'epsilon [(ex: lignes 74-81 ici)](https://www.shadertoy.com/view/MsBGW1). Mmmh, les expressions mathématiques pures. Une simple ligne:


{{< highlight python >}}
normal_at_surface = jax.grad(distance_function)(point_at_surface)
{{< /highlight >}}

## On aime les maths qui sont alignées avec le silicium!

Maintenant, Google n'a probablement pas décidé de construire JAX pour que je puisse économiser quelques frappes de clavier là-dessus. Mais son expressivité fait que ce bout de code est à 70% des maths. Et JAX est une belle étape vers des langages de plus haut niveau, mathématiques, qui restent proches du métal.


---

Addendum: Les choses que j'aurais aimer essayer, mais n'ai pas pu par manque de temps:
* [jax-js](https://jax-js.com/): Support pour WebGPU
* [JAXGA - JAX Geometric Algebra](https://github.com/RobinKa/jaxga): Les SDFs et la 3D en général sont exprimées bien plus clairement dans le language de la géométrie projective. Et JAXGA nous aurait permis d'avoir la géométrie conforme en prime.
* Visualiser la relation entre réseaux de neurones et 3D/SDFs. Les couches denses sont essentiellement un ensemble de
  SDFs de semi-hyperplans qui sont soit limités de façon stricte (ReLU, créant des polytopes) soit de façon douce (Softmax, créant des patatoïdes)
* [jax.experimental.jet](https://docs.jax.dev/en/latest/jax.experimental.jet.html):
  Apparemment [nous pouvons obtenir des développements de Taylor de fonctions](https://medium.com/@andrey.yachmenev_75311/high-order-derivatives-using-jax-taylor-mode-automatic-differentiation-27c63be6ace9).
  Est-ce que cela peut aider à accélérer le ray-marching, de façon similaire
  au [Ray Tracing pour les fonctions harmoniques](https://markjgillespie.com/Research/harnack-tracing/index.html)?
