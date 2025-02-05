FROM oven/bun:1 as base

WORKDIR /app

COPY package.json bun.lock ./

RUN bun install --frozen-lockfile

COPY . .

RUN bunx prisma generate

RUN bun run build

EXPOSE 3000

RUN echo '#!/bin/sh\nbun run start & bun run cron-job.ts & wait -n' > /app/start.sh
RUN chmod +x /app/start.sh

CMD ["/app/start.sh"]