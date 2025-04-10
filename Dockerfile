FROM oven/bun:1 as base

WORKDIR /app

COPY package.json bun.lock ./

RUN bun install --frozen-lockfile

COPY . .

RUN bunx prisma generate

RUN bun run build

EXPOSE 3000

RUN echo '#!/bin/bash\ntrap "exit" INT TERM\ntrap "kill 0" EXIT\nbun run start &\nbun run cron-job.ts &\nwait' > /app/start.sh
RUN chmod +x /app/start.sh

CMD ["/bin/bash", "/app/start.sh"]