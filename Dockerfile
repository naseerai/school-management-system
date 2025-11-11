# ==========================
# 1️⃣ Base dependencies
# ==========================
FROM node:20-alpine AS deps
WORKDIR /app

COPY package.json yarn.lock* package-lock.json* pnpm-lock.yaml* ./
RUN \
  if [ -f yarn.lock ]; then yarn --frozen-lockfile; \
  elif [ -f package-lock.json ]; then npm ci; \
  elif [ -f pnpm-lock.yaml ]; then npm install -g pnpm && pnpm i --frozen-lockfile; \
  else echo "Lockfile not found." && exit 1; \
  fi


# ==========================
# 2️⃣ Build the app
# ==========================
FROM node:20-alpine AS builder
WORKDIR /app

# 👇 Define build-time environment variables
ARG SUPABASE_URL
ARG SUPABASE_SERVICE_ROLE_KEY

# 👇 Make them available during build
ENV SUPABASE_URL=$SUPABASE_URL
ENV SUPABASE_SERVICE_ROLE_KEY=$SUPABASE_SERVICE_ROLE_KEY

COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build


# ==========================
# 3️⃣ Runtime
# ==========================
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

# 👇 Pass Supabase env to runtime too
ENV SUPABASE_URL=$SUPABASE_URL
ENV SUPABASE_SERVICE_ROLE_KEY=$SUPABASE_SERVICE_ROLE_KEY

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

EXPOSE 3000
CMD ["npm", "start"]

