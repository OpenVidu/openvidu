# syntax=docker/dockerfile:1
# OpenVidu Dashboard CE. Build context: the workspace root (openvidu-dashboard/).
ARG NODE_VERSION=24.22.1
ARG DEBIAN_RELEASE=trixie
ARG SAFE_CHAIN_VERSION=1.5.25

# Workspace manifests and the lockfile, shared by the install stages. They run on the build platform, so no package is
# installed, nor checked by safe-chain, under emulation; a --platform on a FROM that names a stage would be ignored.
FROM --platform=$BUILDPLATFORM node:${NODE_VERSION}-${DEBIAN_RELEASE}-slim AS base
ARG SAFE_CHAIN_VERSION
RUN apt-get update \
	&& apt-get install -y --no-install-recommends ca-certificates curl \
	&& curl -fsSL "https://github.com/AikidoSec/safe-chain/releases/download/${SAFE_CHAIN_VERSION}/install-safe-chain.sh" | sh -s -- --ci \
	&& rm -rf /var/lib/apt/lists/*
ENV PATH=/root/.safe-chain/shims:/root/.safe-chain/bin:$PATH
# Only packages flagged as malicious fail the build; a minimum age would fail it for a day after every bump.
ENV SAFE_CHAIN_MINIMUM_PACKAGE_AGE_HOURS=0
RUN npm safe-chain-verify && corepack enable
WORKDIR /workspace
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY dashboard-ce/typings/package.json dashboard-ce/typings/
COPY dashboard-ce/backend/package.json dashboard-ce/backend/
COPY dashboard-ce/frontend/package.json dashboard-ce/frontend/
COPY dashboard-ce/frontend/projects/dashboard-ui/package.json dashboard-ce/frontend/projects/dashboard-ui/
COPY dashboard-ce/e2e/package.json dashboard-ce/e2e/
COPY dashboard-ce/tools/data-generator/package.json dashboard-ce/tools/data-generator/

# The SPA does not depend on the architecture: built once.
FROM base AS frontend
ARG BASE_HREF=/
RUN pnpm install --frozen-lockfile --filter "@openvidu-dashboard/frontend..."
COPY dashboard-ce/typings dashboard-ce/typings
COPY dashboard-ce/frontend dashboard-ce/frontend
RUN BASE_HREF="${BASE_HREF}" pnpm --filter "@openvidu-dashboard/frontend..." run build

# Nor do the backend and its production dependencies, JavaScript only.
FROM base AS backend
RUN pnpm install --frozen-lockfile --filter "@openvidu-dashboard/backend..."
COPY dashboard-ce/typings dashboard-ce/typings
COPY dashboard-ce/backend dashboard-ce/backend
RUN pnpm --filter "@openvidu-dashboard/backend..." run build \
	&& pnpm --filter @openvidu-dashboard/backend --prod deploy /out/app
COPY --from=frontend /workspace/dashboard-ce/frontend/dist/frontend/browser /out/app/dist/public

FROM node:${NODE_VERSION}-${DEBIAN_RELEASE}-slim
# Node bundles its own time zone data; npm, npx, corepack and yarn are not needed to run the backend.
RUN dpkg --purge tzdata \
	&& rm -rf /usr/local/lib/node_modules /usr/local/bin/npm /usr/local/bin/npx /usr/local/bin/corepack \
		/usr/local/bin/yarn /usr/local/bin/yarnpkg /opt/yarn-*
COPY --from=backend /out/app /app
WORKDIR /app
ENV NODE_ENV=production
USER node
EXPOSE 5000
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 CMD ["node", "/app/dist/server.js", "healthcheck"]
CMD ["node", "/app/dist/server.js"]
