## A Deployment Pipeline System that does the following:
- Accepts a Git repository URL or a zipped project folder from a user
- Builds the project into a container image using Railpack
- Runs the container locally using Docker
- Registers a reverse-proxy route in Caddy so the deployed app is reachable over HTTP
- The entire system starts with a single docker compose up command

### Building one step at a time.
