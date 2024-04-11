Code for [benoit.paris](https://benoit.paris)

[Hugo](https://gohugo.io/), with [Monochrome](https://github.com/kaiiiz/hugo-theme-monochrome/)

----

Hugo builder:

    docker build -t hugo .

Develop:

    open http://localhost:1313 &\
      docker run -it --network host --rm -v .:/build_dir hugo serve

Build & Deploy:

    docker run -it --network host --rm -v .:/build_dir hugo
    ... validate and commit
    git push

