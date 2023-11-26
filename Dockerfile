FROM node:16.17.0

# install desired version of yarn
RUN corepack enable && corepack prepare yarn@3.5.1 --activate

COPY package.json /app/package.json
COPY .yarn /app/.yarn
COPY yarn.lock /app/yarn.lock
RUN cd /app && yarn install

COPY tsconfig.json /app/tsconfig.json
COPY tsconfig.cjs.json /app/tsconfig.cjs.json
COPY tsconfig.esm.json /app/tsconfig.esm.json
COPY tsconfig.types.json /app/tsconfig.types.json
COPY .eslintrc.json /app/.eslintrc.json

COPY src /app/src

WORKDIR /app
