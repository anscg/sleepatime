# sleepatime

A nextjs application for tracking sleep and send them to wakatime.

## 🌟 Features

Login with Fitbit and authorize your wakatime account!

## 🚀 Tech Stack

- [Next.js](https://nextjs.org/) - React framework for production
- [Prisma](https://prisma.io/) - Next-generation ORM for Node.js and TypeScript
- [Tailwind CSS](https://tailwindcss.com/) - Utility-first CSS framework
- [TypeScript](https://www.typescriptlang.org/) - Typed JavaScript at scale
- [Bun](https://bun.sh/) - Fast all-in-one JavaScript runtime

![image](https://github.com/user-attachments/assets/9e22026d-05d5-479e-9622-f1a1dbdfe177)
![image](https://github.com/user-attachments/assets/90001333-7f55-45fc-b565-e0ee94786dc6)

## 🛠️ Getting Started

### Prerequisites

- Bun
- A PostgreSQL database

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/anscg/sleepatime
   cd sleepatime
   ```
2. Install dependencies:
    ```bash
    bun install
    ```
3. Create a .env file in the root directory and add your environment variables:
    ```env
    FITBIT_CLIENT_ID
    FITBIT_CLIENT_SECRET
    FITBIT_REDIRECT_URI
    WAKATIME_CLIENT_ID
    WAKATIME_CLIENT_SECRET
    WAKATIME_REDIRECT_URI
    NEXTAUTH_URL
    POSTGRES_URL
    REDIS_URL
    ```

4. Migrate!
    ```bash
    bun prisma:migrate
    ```

5. Run both the cron job and nextjs!

Enjoy! ❤️

---

Made with sleep deprivation by anson 😴