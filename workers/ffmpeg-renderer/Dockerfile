FROM node:22-bookworm-slim

RUN apt-get update \
  && apt-get install -y --no-install-recommends ffmpeg \
  && rm -rf /var/lib/apt/lists/*

RUN ffmpeg -filters 2>/dev/null | grep -q drawtext

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

COPY tsconfig.json ./
COPY fonts ./fonts
COPY src ./src
RUN npm run build

ENV NODE_ENV=production
ENV FONT_PATH=/app/fonts/SpaceGrotesk-SemiBold.ttf

CMD ["node", "dist/index.js"]
