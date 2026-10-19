// Talks to start.ng through its hidden connect page (see https://start.ng/docs.md).
const START_NG = 'https://start.ng';
let frame;

function connectFrame() {
  frame ??= new Promise((resolve, reject) => {
    const el = document.createElement('iframe');
    el.src = `${START_NG}/connect`;
    el.hidden = true;
    el.onload = () => resolve(el);
    el.onerror = reject;
    document.body.append(el);
  });
  return frame;
}

// Sends a message and resolves to start.ng's reply, or null if it didn't answer.
export async function askStartNg(message, replyType, timeoutMs = 5000) {
  let el;
  try {
    el = await connectFrame();
  } catch {
    return null;
  }
  return new Promise((resolve) => {
    const requestId = Math.random().toString(36).slice(2);
    const done = (reply) => { clearTimeout(timer); removeEventListener('message', onMessage); resolve(reply); };
    const timer = setTimeout(() => done(null), timeoutMs);
    function onMessage(e) {
      if (e.origin !== START_NG || e.source !== el.contentWindow) return;
      if (e.data?.type === replyType && e.data.requestId === requestId) done(e.data);
    }
    addEventListener('message', onMessage);
    el.contentWindow.postMessage({ ...message, requestId }, START_NG);
  });
}

export function signIn() {
  location.href = `${START_NG}/?return_to=${encodeURIComponent(location.origin + location.pathname)}`;
}

// Used until start.ng answers, and when the game is opened outside start.ng.
export const FALLBACK_GUEST = {
  name: 'Guest',
  style: {
    body: 'male', primaryColor: '#4b7bec', secondaryColor: '#2b2f4a', skinColor: '#8d5524',
    hairColor: '#17120f', hair: 'short', hat: 'none', accessory: 'none',
  },
  face: null,
};
