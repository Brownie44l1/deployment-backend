# Deployment Pipeline

A self-hosted deployment system that accepts Git repository URLs or zipped project folders, builds them into container images using [Railpack](https://railpack.com), runs them via Docker, and exposes them through a Caddy reverse proxy.

## Quick Start

```bash
docker compose up --build
```

The API is available at `http://localhost:3000` and Caddy at `http://localhost:80`.

## API

### Deploy a project from a Git URL

```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{"repoUrl": "https://github.com/user/repo"}' \
  http://localhost:3000/deploy
```

Returns a server-sent events (SSE) stream with build logs.

### Deploy from a zip file

```bash
curl -X POST \
  -F "file=@project.zip" \
  http://localhost:3000/deploy
```

### List deployments

```bash
curl http://localhost:3000/deployments
```

### Remove a deployment

```bash
curl -X DELETE http://localhost:3000/deployments/<id>
```

### Health check

```bash
curl http://localhost:3000/health
```

## Architecture

| Component | Role |
|---|---|
| **api-server** (Bun/Hono) | Handles deploy requests, orchestrates builds |
| **Railpack** | Builds projects into Docker images |
| **Caddy** | Reverse proxy — routes `*.localhost` to deployed containers |
| **Docker** | Runs each deployed project in an isolated container |

Deployed apps are accessible at `http://<image-tag>.localhost`.

## How it works

1. User submits a Git URL or zip file to `POST /deploy`
2. Server clones the repo or extracts the zip to `/tmp/builds/`
3. Railpack builds a Docker image from the source
4. Docker runs the image on an available port (4000–9000)
5. Caddy admin API registers a route from `<id>.localhost` to that port
6. The deployment is tracked in an in-memory registry

## Prerequisites

- Docker and Docker Compose
- The Docker socket is mounted into the API server container (`/var/run/docker.sock`)
