FROM mcr.microsoft.com/playwright:v1.49.1-noble

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --chown=pwuser:pwuser src ./src

ENV NODE_ENV=production
EXPOSE 10000

USER pwuser
CMD ["node", "src/server.js"]