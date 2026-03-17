// utils/detectFreighter.js
export function waitForFreighter(timeout = 3000) {
  return new Promise((resolve) => {
    // Already available — resolve immediately
    if (window.freighterApi) {
      return resolve(true);
    }

    const interval = setInterval(() => {
      if (window.freighterApi) {
        clearInterval(interval);
        clearTimeout(timer);
        resolve(true);
      }
    }, 100); // check every 100ms

    // Give up after timeout
    const timer = setTimeout(() => {
      clearInterval(interval);
      resolve(false); // not found — genuinely not installed
    }, timeout);
  });
}
