FROM node:22-alpine

WORKDIR /app

COPY core/AFX-CORE/package.json ./core/AFX-CORE/package.json
COPY platform/API/package.json ./platform/API/package.json
RUN npm install --prefix ./core/AFX-CORE --omit=dev \
  && npm install --prefix ./platform/API --omit=dev

COPY core/AFX-CORE/src ./core/AFX-CORE/src
COPY platform/Gateway ./platform/Gateway
COPY platform/API ./platform/API

WORKDIR /app/platform/API
USER node
CMD ["node", "server.js"]
