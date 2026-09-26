export function outboxWorker() {
  setInterval(() => {
    console.log("Worker !!");
  }, 2000);
}
