FROM node:22-bookworm-slim

ENV NODE_ENV=production
WORKDIR /app

COPY core/AFX-CORE/package*.json /app/core/AFX-CORE/
RUN cd /app/core/AFX-CORE && npm ci --omit=dev --no-audit --no-fund

COPY core/AFX-CORE/src /app/core/AFX-CORE/src
COPY platform/Gateway /app/platform/Gateway
COPY platform/Search /app/platform/Search
COPY platform/runtime /app/platform/runtime
COPY domains/runtime /app/domains/runtime
COPY domains/product /app/domains/product

EXPOSE 8080

USER node
CMD ["node", "platform/Gateway/server.mjs"]
