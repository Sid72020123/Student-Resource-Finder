# Student Resource Finder [MLSC Club Pre-Interview Task]

Students often spend time asking around for class notes, papers and useful links. Resource Finder puts those shared study materials in one searchable list.

## Features

- Search and filter resources by subject, semester, unit and type.
- Add a resource link or a local `file:///` path and open it in a new tab. Local files are referenced, not uploaded.
- Save bookmarks for the current browser.
- Use the app with a keyboard and screen reader.

## Tech stack

- HTML, CSS and vanilla JavaScript
- FastAPI, SQLAlchemy and Pydantic
- PostgreSQL (supabase)

## Hosting

This project is temporarily hosted on the following services:

- Frontend - [Vercel](https://vercel.com/)
- Backend - [Render](https://render.com/)
- BD - [Supabase](https://supabase.com/)

## Run locally

1. Create a PostgreSQL database named `student_resources` (or use a hosted PostgreSQL database).
2. Create and activate a Python virtual environment, then install the backend packages:

    ```sh
    python -m venv .venv
    source .venv/bin/activate
    pip install -r requirements.txt
    ```

3. Copy `.env.example` to `.env`, set `DATABASE_URL` to your PostgreSQL connection string, and set `FRONTEND_ORIGINS` to the origin serving the frontend. For local development, use `http://localhost:5500,http://127.0.0.1:5500`. Do not commit `.env`.

    Load those variables in the terminal before starting the backend:

    ```sh
    set -a
    source .env
    set +a
    ```

4. Create the tables when the API starts and add the example data once:

    ```sh
    python -m backend.seed
    uvicorn backend.main:app --reload
    ```

    The API is available at `http://localhost:8000`. The seed command skips adding data when resources already exist.

5. In a second terminal, serve the static frontend from this folder:

    ```sh
    python -m http.server 5500 --directory frontend
    ```

    Open `http://localhost:5500`. For deployment, change `API_BASE_URL` in `frontend/config.js` to the deployed API URL and set `FRONTEND_ORIGINS` to the frontend's origin. Never put database credentials in frontend files.

The static pages and assets are in `frontend/`; the FastAPI application and database code are in `backend/`.

## API

- `GET /api/resources` supports `search`, `subject`, `semester`, `unit` and `type` filters.
- `GET /api/resources/{id}`, `POST /api/resources`, `PUT /api/resources/{id}` and `DELETE /api/resources/{id}` manage resources.
- `GET /api/subjects` lists subjects.
- `GET /api/bookmarks?user_id=...`, `POST /api/bookmarks` and `DELETE /api/bookmarks/{resource_id}?user_id=...` manage browser bookmarks.

The frontend creates an anonymous ID in local storage and sends it with bookmark requests.
