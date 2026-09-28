FROM node:22-alpine
WORKDIR /app

COPY core/AFX-CORE/package*.json ./core/AFX-CORE/
WORKDIR /app/core/AFX-CORE
RUN npm ci --omit=dev --no-audit --no-fund
WORKDIR /app

COPY core/AFX-CORE/src ./core/AFX-CORE/src
COPY platform/Gateway ./platform/Gateway
COPY platform/Search ./platform/Search
COPY domains ./domains

ENV NODE_ENV=production
ENV PORT=8080
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 CMD node -e "fetch('http://127.0.0.1:8080/v1/health/core').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"
USER node
CMD ["node", "platform/Gateway/server.mjs"]
