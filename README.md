# Panic Ring

## Requirements

- Node.js 20 or newer
- npm

## Run with Supabase

1. Install the dependencies:

   ```sh
   npm ci
   ```

2. Configure the Supabase connection and database schema:

   ```sh
   npm run setup:cloud
   ```

   Follow the prompts to provide your Supabase project URL and public anon key.
   The setup script writes the local `.env` file.

3. Start the development server:

   ```sh
   npm run dev
   ```

   Open `http://localhost:5173`.

To configure the environment manually, copy `.env.example` to `.env` and set
`VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. `VITE_W3W_API_KEY` is
optional.

## Run with Docker

Install and start Docker Desktop, then run:

```sh
npm ci
npm run setup
npm run docker:up
```

The setup script creates local Docker and Vite environment files. The app is
available at `http://localhost:8080`; the development server can be started in
a separate terminal with `npm run dev`.

Stop the Docker services with:

```sh
npm run docker:down
```

## Build

```sh
npm run build
npm run preview
```

The preview server runs at `http://localhost:4173`.
