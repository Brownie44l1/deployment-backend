import { error } from "console";

const url = "http://localhost:3000/ping";

async function ping(): Promise<void> {
  try {
    const response = await fetch(url);
    const data = await response.json();
    console.log(`[${new Date().toLocaleTimeString()}]`, data);
  } catch(error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.log(`[${new Date().toLocaleTimeString()}], Error:`, errorMessage);
  }
}

ping();
setInterval(ping, 3000);