---
title: "Indice d'une courbe autour d'un point avec une Intégrale de Cauchy, en WebGL"
date: 2022-08-24T15:53:54+02:00
---

# Indice d'une courbe autour d'un point avec une Intégrale de Cauchy, en WebGL

Voici une visualisation de [l'indice -le nombre de tours-](https://fr.wikipedia.org/wiki/Indice_(analyse_complexe)) {{< unsafe >}}<mjx-container class="MathJax CtxtMenu_Attached_0" jax="CHTML" tabindex="0" ctxtmenu_counter="0" style="font-size: 113.1%; position: relative;"><mjx-math class="MJX-TEX" aria-hidden="true"><mjx-mi class="mjx-i"><mjx-c class="mjx-c1D45B TEX-I"></mjx-c></mjx-mi><mjx-mo class="mjx-n"><mjx-c class="mjx-c28"></mjx-c></mjx-mo><mjx-mi class="mjx-i"><mjx-c class="mjx-c1D6FE TEX-I"></mjx-c></mjx-mi><mjx-mo class="mjx-n"><mjx-c class="mjx-c2C"></mjx-c></mjx-mo><mjx-mi class="mjx-i" space="2"><mjx-c class="mjx-c1D44E TEX-I"></mjx-c></mjx-mi><mjx-mo class="mjx-n"><mjx-c class="mjx-c29"></mjx-c></mjx-mo></mjx-math><mjx-assistive-mml unselectable="on" display="inline"><math xmlns="http://www.w3.org/1998/Math/MathML"><mi>n</mi><mo stretchy="false">(</mo><mi>γ</mi><mo>,</mo><mi>a</mi><mo stretchy="false">)</mo></math></mjx-assistive-mml></mjx-container>{{< /unsafe >}} d'une courbe {{< unsafe >}}<mjx-container class="MathJax CtxtMenu_Attached_0" jax="CHTML" tabindex="0" ctxtmenu_counter="1" style="font-size: 113.1%; position: relative;"><mjx-math class="MJX-TEX" aria-hidden="true"><mjx-mi class="mjx-i"><mjx-c class="mjx-c1D6FE TEX-I"></mjx-c></mjx-mi></mjx-math><mjx-assistive-mml unselectable="on" display="inline"><math xmlns="http://www.w3.org/1998/Math/MathML"><mi>γ</mi></math></mjx-assistive-mml></mjx-container>{{< /unsafe >}} autour du point {{< unsafe >}}<mjx-container class="MathJax CtxtMenu_Attached_0" jax="CHTML" tabindex="0" ctxtmenu_counter="3" style="font-size: 113.1%; position: relative;"><mjx-math class="MJX-TEX" aria-hidden="true"><mjx-mi class="mjx-i"><mjx-c class="mjx-c1D44E TEX-I"></mjx-c></mjx-mi></mjx-math><mjx-assistive-mml unselectable="on" display="inline"><math xmlns="http://www.w3.org/1998/Math/MathML"><mi>a</mi></math></mjx-assistive-mml></mjx-container>{{< /unsafe >}}, exprimée selon un cas spécial de la [Formule intégrale de Cauchy](https://fr.wikipedia.org/wiki/Formule_int%C3%A9grale_de_Cauchy); avec une courbe qu'on ne ferme pas nécessairement sur elle-même. Les nombres complexes sont représentés dans un espace teinte-saturation.

$$ n(\gamma ,a) = \frac{1}{2 \pi i}\int_{\gamma}^{}\frac{1}{z-a}dz $$

## Demo

(faites glisser la souris/le pouce sur la surface rouge)

{{< partial "custom/winding/index.html" >}}

Chaque pixel affiche par sa couleur son indice: la partie réelle donne la teinte, la partie imaginaire la luminance. Des formes prédéfinies sont mises à disposition.

## La formule

Pendant la démonstration de la [Formule intégrale de Cauchy](https://fr.wikipedia.org/wiki/Formule_int%C3%A9grale_de_Cauchy), on tombe sur une formule remarquable. Formée à partir de composantes innocentes complexes, elle donne toujours un nombre entier et réel. De plus, assez mystérieusement, elle indique le nombre de tour que la courbe fait autour du point! Mais on exige que la courbe soit être fermée sur elle même.

Ne me demandez pas une explication intuitive du phénomène. À vrai dire j'ai construit cette visualisation pour essayer de m'en faire une idée. [Vous pouvez tenter de construire la votre à partir de ces réponses](https://math.stackexchange.com/questions/4054/intuitive-explanation-of-cauchys-integral-formula-in-complex-analysis).

Du coup, que se passe-t-il si on ne referme pas la boucle? Eh bien la formule nous renvoie une 'erreur', sous la forme d'un nombre qui comporte désormais une partie imaginaire. Une zone devient positive et demande qu'on parte de ce point (luminance élevée), ou bien négative (faible luminance) si il faut qu'on y aille. On peut alors 'rendre le plan réel' en allant des parties lumineuses vers les sombres et effectivement clore les courbes sur elle-mêmes. La formule est fournie avec sa propre fonction de debogage!

On notera que l'inverse d'une courbe est la même courbe mais parcourue en sens inverse: on remplace $dz$ by $-dz$ dans la formule. Aussi, l'intégration (~somme, ici) est commutative et peut être effectuée dans n'importe quel ordre; c'est l'option 'shuffle'.

Ceci signifie qu'on peut diviser une plus grande courbe en deux par un aller-retour entre deux de ses points, en réarrangeant les intégrales. Cette opération est l'identité, puisqu'on vient seulement de rajouter une courbe et son inverse. Et vice versa, on peut fusionner deux courbes ayant un bord commun en une plus grande.

{{< figure src="/shape-splitting.png" caption="Diviser une courbe, si on regarde pas les artéfacts" >}}

## Artéfacts

On peut configurer des niveaux de précision pour utiliser des $dz$ plus ou moins grands. Une précision plus fine aura moins de pointillés, une meilleure fidélité de l'intégration, ce sera plus lente; cependant on pourrait accumuler plus d'erreur due à l'imprecision des nombres flottants.

Sur mobile il se peut que vous ne voyiez pas de surface unie sur des courbes fermées. C'est dû au fait que les résultats intermédiaires sont stockés dans des textures en nombres flottants, et que [WebGL ne donne que 4 bits sur mobile, alors qu'il en fournit 16 sur Desktop](https://webglfundamentals.org/webgl/lessons/webgl-precision-issues.html#texture-formats).

## Code

[Ici](https://github.com/benoitparis/winding-contour-cauchy)

## Construction

Bon, si vous voulez un calcul sur une zone de ~500x500 pixel pour une courbe de 1000 éléments, on est déjà à 250 million d'opérations; l'utilisation d'un GPU est donc pluc adaptée.

J'utilise deux [`fragment shaders`](https://www.khronos.org/opengl/wiki/Fragment_Shader). Un pour projeter les parties réeles et imaginaires, que je stocke dans les channels rouge et vert, dans un espace teinte-saturation-luminance. J'ai choisi la teinte pour la partie réelle parce qu'elle illustre un 'degré de situation' pour un point. On voudra commenter la cohérence de cette situation dans un sens ou un autre: ce sera donc la luminance pour la partie imaginaire. Et on met une saturation constante. La teinte est coefficientée de telle sorte qu'un nombre entier de tours (12) nous ramène au rouge.

L'autre `fragment shader` contient la formule, et deux textures sont interverties en lecture-écriture pour accumuler la somme. La programmation en [glsl](https://fr.wikipedia.org/wiki/OpenGL_Shading_Language)/WebGL est admirablement claire avec sa nature [SIMD](https://fr.wikipedia.org/wiki/Single_instruction_multiple_data). On donne les coordonnées (x,y) d'un pixel, et charge au programmeur de déterminer la couleur de ce pixel:

{{< highlight glsl >}}
void main(void) {                                                
    vec2 a = gl_FragCoord.xy / 512.0;                  # mise à l'echelle de xy
    vec2 prev = texture2D(u_calcSamp, a).xy;           # valeur précedente
                                                       # formule de Cauchy
    vec2 delta = a - u_z;                              
    float denom = dot(delta, delta);                          
    gl_FragColor = vec4(                                        # rgba en sortie
        prev.x + (delta.x * u_dz.y - delta.y * u_dz.x) / denom, # réel en rouge
        prev.y + dot(delta, u_dz) / denom,                      # imaginaire en vert
        1.0,                                                    
        1.0                                                     
    );
}
{{< /highlight >}}

Si programmer en glsl/WebGL vous tente, je recommande vivement le site [Shadertoy](https://www.shadertoy.com/).

Par ailleurs je mesure le temps entre deux `animation frames`, et met autant de cycles de calcul que possible en essayant de ne pas dépasser 40ms entre deux frames.

C'est à peu près tout, le reste du code est de la colle, de l'UI, et des fonctionalités classiques.

----