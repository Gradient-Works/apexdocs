FROM node:14

LABEL org.opencontainers.image.source https://github.com/gradient-works/apexdocs

RUN mkdir /apexdocs
WORKDIR /apexdocs

COPY . .

RUN npm install --unsafe-perm
RUN npm link 

cmd ["/bin/bash"]
