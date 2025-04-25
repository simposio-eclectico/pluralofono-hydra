import "./style/style.css";
import Theremin from "./theremin.ts";

document.querySelector<HTMLDivElement>("#app")!.innerHTML = `
  <div>
    <canvas id="theremin"></canvas>
  </div>
`;

document.body.addEventListener('touchmove', function(event) {
  event.preventDefault();
}, false); 

new Theremin(document.querySelector<HTMLCanvasElement>("#theremin")!);
