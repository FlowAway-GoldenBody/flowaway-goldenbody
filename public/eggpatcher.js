console.log("%c[EggPatcher] %cWebSocket patcher initialized", "color: magenta; font-weight: bold", "color: white");
(() => {
  debugger;
  class LoggedWebSocket extends WebSocket {
  constructor(url, protocols) {
    // Log the URL before the connection starts and apply safe replacements
    let a = window.top.origin.split('/');
    let b = a[2];
    // Work on a local copy and apply replacements with assignment
    let finalUrl = String(url);
    // If the top frame host appears in the URL, prefer the current host
    if (finalUrl.includes(b)) finalUrl = finalUrl.replace(b, window.location.host);
    if (finalUrl.includes('egs') && finalUrl.includes(window.location.hostname.split('.')[1])) {
      finalUrl = finalUrl.replace(window.location.hostname.split('.')[1]+'.'+window.location.hostname.split('.')[2], 'shellshock.io');
    }
    // If the URL indicates 'ser' (services), use the services endpoint
    if (finalUrl.includes('ser')) {
      finalUrl = 'wss://shellshock.io/services/';
    }
    console.log(`%c[WS Connect] %cConnecting to: ${finalUrl}`, "color: cyan; font-weight: bold", "color: white");
    // 2. Pass arguments to the original WebSocket constructor
    super(finalUrl, protocols);

    // 3. Optional: Add listeners to log when the connection actually opens
    this.addEventListener('open', () => {
      console.log(`%c[WS Open] %cSuccessfully connected to ${this.url}`, "color: green; font-weight: bold", "color: white");
    });

    this.addEventListener('error', (err) => {
      console.error(`[WS Error] Connection failed to ${this.url}`, err);
    });
  }
}

// Usage:
window.WebSocket = LoggedWebSocket;
})();