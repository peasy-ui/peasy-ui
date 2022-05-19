import { UI } from "../src/index";
import 'styles.css';

window.addEventListener('DOMContentLoaded', (event) => {
  main();
});

function main(): void {
  console.log('Hello, World!');

  let demoUI;

  const model = {
    color: 'lightgray',
    left: false,
    right: true,
    demo: 'card',
    clicked: (_event, model, _boundElement, _boundEvent) => model.color = 'gold',
    changed: (_ev, model, element) => {
      demoUI = selectDemo(model, demoUI);
    },
    ball: {
      position: { x: random(25, 175), y: random(25, 175) },
      velocity: { x: random(100, 200), y: random(100, 200) },
    },
    card: {
      value: 'The Ace',
      position: { x: 50, y: 25 },
      faceUp: false,
      get rotateY() { return this.faceUp ? 0 : 180; }
    }
  };
  // UI.create(document.body, `
  // <div>Demo: 
  //   <select \${change@=>changed}>
  //     <option \${'card'==>demo}>Card</option>
  //     <option \${'ball'==>demo}>Ball</option>
  //   </select>
  //   <b>\${demo}</b>
  // </div>
  // `, model);
  UI.create(document.body, `
    <div class="main" style="background-color: \${color};">
      <div>Color: <input \${value <=> color}> <span>The color is <b>\${color}</b>.</span> <button \${click @=> clicked}>Set to gold</button></div>
      <div>Checks: <label><input type="checkbox" \${checked <=> left}> Left</label> <label><input type="checkbox" \${checked <=> right}> Right</label> <b>\${left} \${right}</b></div>
      <div>Demo: 
        <label><input type="radio" name="demo" \${'card' ==> demo} \${change @=> changed}>Card</label>
        <label><input type="radio" name="demo" \${'ball' ==> demo} \${change @=> changed}>Ball</label> 
        <b>\${demo}</b>
       </div>
      <div>Demo: 
        <select \${change @=> changed}>
          <option \${'card' ==> demo}>Card</option>
          <option \${'ball' ==> demo}>Ball</option>
        </select>
       <b>\${demo}</b>
      </div>
   </div>`,
    model);

  demoUI = selectDemo(model, demoUI);

  // document.querySelector('.main input').addEventListener('change', (...params) => console.log('CHANGE', params));
  // document.querySelector('.main input').addEventListener('input', (...params) => console.log('INPUT', params));

  setTimeout(() => model.color = 'blue', 2000);
  setTimeout(() => {
    model.demo = 'ball';
    demoUI = selectDemo(model, demoUI);
  }, 3000);
  setTimeout(() => model.color = 'green', 4000);

  setInterval(() => model.card.faceUp = !model.card.faceUp, 1500);

  setInterval(() => {
    model.ball.position.x += model.ball.velocity.x * 1 / 60;
    model.ball.position.y += model.ball.velocity.y * 1 / 60;
    if (model.ball.position.x < 0) {
      model.ball.position.x = 0;
      model.ball.velocity.x = -model.ball.velocity.x;
    } else if (model.ball.position.x > 180) {
      model.ball.position.x = 180;
      model.ball.velocity.x = -model.ball.velocity.x;
    }
    if (model.ball.position.y < 0) {
      model.ball.position.y = 0;
      model.ball.velocity.y = -model.ball.velocity.y;
    } else if (model.ball.position.y > 180) {
      model.ball.position.y = 180;
      model.ball.velocity.y = -model.ball.velocity.y;
    }
    UI.update();
    // console.log(JSON.stringify(model));
  }, 1000 / 60);
}

function selectDemo(model, demoUI) {
  console.log('Selecting demo', model.card, model.ball, model.demo);

  const templateCard = `
  <div class="border">
    <div class="card" style="
      transform: translate3d(\${card.position.x}px, \${card.position.y}px, 0) rotateY(\${card.rotateY}deg);
    ">
      <div class="card-back" style="background-color: \${color}"></div>
      <div class="card-face">\${card.value}</div>
    </div>
  </div>
  `;

  const templateBall = `
    <div class="border">
      <div class="ball" style="background-color: \${color}; transform: translate3d(\${ball.position.x}px, \${ball.position.y}px, 0)"></div>
    </div>
  `;

  if (demoUI != null) {
    demoUI.destroy();
  }
  const template = model.demo === 'ball' ? templateBall : templateCard;
  demoUI = UI.create(document.body, template, model);

  return demoUI;
}

function random(min, max) {
  return Math.floor(Math.random() * (max - min) + min);
}
