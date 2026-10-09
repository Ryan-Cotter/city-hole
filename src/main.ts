import "./styles.css";
import { Game } from "./game/Game";
try {
  new Game(document.querySelector("#app")!);
} catch (error) {
  document.querySelector("#app")!.innerHTML =
    '<div class="error"><h1>Could not start City Hole</h1><p>This game needs a browser with WebGL support. Refresh or try another browser.</p></div>';
  console.error(error);
}

if (import.meta.env.PROD && "serviceWorker" in navigator)
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(console.warn);
  });
