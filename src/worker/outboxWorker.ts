export function outboxWorker() {
    setInterval(
        () => {
            console.log('Worker !!');
        },

        2000
    );
}

/**
 * async function processPendingEvents() {
  const events = await getPendingEvents();

  for (const event of events) {
    await processEvent(event);
  }
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}


async function startOutboxWorker() {
  console.log("Outbox worker started");

  while (true) {
    try {
      await processPendingEvents();
    } catch (error) {
      console.error("Outbox worker error:", error);
    }

    await sleep(WORKER_INTERVAL);
  }
}
 * 
 */
