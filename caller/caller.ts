const url = "http://ping-server:3000/ping"; //compose maps service name to ip

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