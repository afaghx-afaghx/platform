FROM node:22-alpine
WORKDIR /app

COPY core/AFX-CORE/package*.json ./core/AFX-CORE/
RUN cd core/AFX-CORE && npm ci --omit=dev --no-audit --no-fund

COPY core/AFX-CORE/src ./core/AFX-CORE/src
COPY platform/Gateway ./platform/Gateway
COPY platform/Search ./platform/Search
COPY domains ./domains

ENV NODE_ENV=production
ENV PORT=8080
EXPOSE 8080
USER node
CMD ["node", "platform/Gateway/server.mjs"]
