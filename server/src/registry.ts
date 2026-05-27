export interface Deployment {
  id: string;
  name: string;
  source: string;
  hostPort: number;
  containerName: string;
  status: string;
  createdAt: Date;
}

const registry = new Map<string, Deployment>();

export function create(
  id: string,
  name: string,
  source: string,
  hostPort: number,
  containerName: string,
  status: string,
  createdAt: Date
): Deployment {
  const deployment: Deployment = {
    id,
    name,
    source,
    hostPort,
    containerName,
    status,
    createdAt,
  };
  registry.set(id, deployment);
  return deployment;
}

export function getById(id: string): Deployment | undefined {
  return registry.get(id);
}

export function getAll(): Deployment[] {
  return Array.from(registry.values());
}

export function updateStatus(id: string, status: string): Deployment | undefined {
  const deployment = registry.get(id);
  if (deployment) {
    deployment.status = status;
    registry.set(id, deployment);
    return deployment;
  }
  return undefined;
}

export function remove(id: string): void {
  registry.delete(id);
}

export function findAvailablePort(): number {
  const usedPorts = new Set(Array.from(registry.values()).map(d => d.hostPort));
  const min = 4000;
  const max = 9000;
  
  const availablePorts: number[] = [];
  for (let port = min; port <= max; port++) {
    if (!usedPorts.has(port)) {
      availablePorts.push(port);
    }
  }
  
  if (availablePorts.length === 0) {
    throw new Error('No available port found in the range 4000-9000');
  }
  
  const randomIndex = Math.floor(Math.random() * availablePorts.length);
  return availablePorts[randomIndex]!;
}