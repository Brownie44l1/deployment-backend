FROM oven/bun:latest

# Install dependencies, docker CLI, git, and unzip (for zip extraction)
RUN apt-get update && apt-get install -y \
    curl \
    git \
    unzip \
    && curl -fsSL https://get.docker.com | sh \
    && rm -rf /var/lib/apt/lists/*

# Install railpack
RUN curl -sSL https://railpack.com/install.sh | sh

WORKDIR /app

# Copy root configurations and install dependencies
COPY package.json ./
RUN bun install

# Copy project source
COPY . .

# Start the actual API server
CMD ["bun", "server/server.ts"]
