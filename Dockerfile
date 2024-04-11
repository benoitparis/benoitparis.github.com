FROM debian:12.5-slim
RUN apt update
RUN apt -y install hugo
WORKDIR ./build_dir/
ENTRYPOINT ["hugo"]