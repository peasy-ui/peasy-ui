import { UI } from "../src/index";
import 'styles.css';

window.addEventListener('DOMContentLoaded', (event) => {
  main();
});

const balls = 100;

function main(): void {
  console.log('Hello, World!');

  let demoUI;

  const model = {
    color: 'lightgray',
    list: ['one', 'two'],
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
      get rotateY() { return this.faceUp ? 0 : 180; },
      flip: () => model.card.faceUp = !model.card.faceUp,
    },
    balls: [],
    // slots: [],
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
    <div class="main" style="background-color: \${color};"> List: \${list[1]}
      <div>Color: <input \${value <=> color}> <span>The color is <b>\${color}</b>.</span> <button \${click @=> clicked}>Set to gold</button></div>
      <div>Checks: <label><input type="checkbox" \${checked <=> left}> Left</label> <label><input type="checkbox" \${checked <=> right}> Right</label> <b>\${left} \${right}</b></div>
      <div>Demo: 
        <label><input type="radio" name="demo" \${'card' ==> demo} \${change @=> changed}>Card</label>
        <label><input type="radio" name="demo" \${'ball' ==> demo} \${change @=> changed}>Ball</label> 
        <b>\${demo}</b>
       </div>
      <div>Demo: 
        <select \${change @=> changed} \${ ==> demoElement}>
          <option \${'card' ==> demo}>Card</option>
          <option \${'ball' ==> demo}>Ball</option>
        </select>
       <b>\${demo}</b>
      </div>
   </div>
   `, model);

  //  console.log('model', model);

//   const slots = 5;
//   let templateSlots = `
//    <div class="slots">
//    `;
//   for (let i = 0; i < slots; i++) {
//     model.slots[i] = {
//       index: i,
//       name: i + 1
//     };
//     console.log('slot', model.slots[i]);
//     templateSlots += `<div class="slot slot-\${slots[${i}].index}" style="background-color: \${color};">\${slots[${i}].name}</div>`;
//   }
//   templateSlots += `
//    </div>
//  `;
//   UI.create(document.body, templateSlots, model);

  demoUI = selectDemo(model, demoUI);

  setTimeout(() => model.color = 'blue', 2000);
  setTimeout(() => {
    model.demo = 'ball';
    demoUI = selectDemo(model, demoUI);
  }, 3000);
  setTimeout(() => model.color = 'green', 4000);

  setInterval(() => model.card.flip(), 2500);

  // setInterval(() => {
  //   const item = itemsShift(model.slots);
  //   setTimeout(() => {
  //     // itemsPush(model.slots, item);
  //   }, 1000);
  // }, 2000);

  setInterval(() => {
    updateBall(model.ball);
    for (let i = 0; i < balls; i++) {
      updateBall(model.balls[i]);
    }

    UI.update();
    // console.log(JSON.stringify(model));
  }, 1000 / 60);
}

// function itemsShift(items) {
//   items.forEach(item => item.index--);
//   return items.shift();
// }
//  function itemsPush(items, item) {
//   const maxIndex = Math.max(...items.map(item => item.index));
//   console.log(maxIndex);
//   item.index = maxIndex + 1;
//   items.push(item);
// }

function updateBall(ball) {
  ball.position.x += ball.velocity.x * 1 / 60;
  ball.position.y += ball.velocity.y * 1 / 60;
  if (ball.position.x < 0) {
    ball.position.x = 0;
    ball.velocity.x = -ball.velocity.x;
  } else if (ball.position.x > 180) {
    ball.position.x = 180;
    ball.velocity.x = -ball.velocity.x;
  }
  if (ball.position.y < 0) {
    ball.position.y = 0;
    ball.velocity.y = -ball.velocity.y;
  } else if (ball.position.y > 180) {
    ball.position.y = 180;
    ball.velocity.y = -ball.velocity.y;
  }
}

function selectDemo(model, demoUI) {
  // console.log('Selecting demo', model.card, model.ball, model.demo);

  const templateCard = `
  <div class="border">
    <div class="card" \${click @=> card.flip} style="
      transform: translate3d(\${card.position.x}px, \${card.position.y}px, 0) rotateY(\${card.rotateY}deg);
    ">
      <div class="card-back" style="background-color: \${color}"></div>
      <div class="card-face">\${card.value}</div>
    </div>
  </div>
  `;

  model.balls = [];
  for (let i = 0; i < balls; i++) {
    model.balls.push({
      position: { x: random(25, 175), y: random(25, 175) },
      velocity: { x: random(100, 200), y: random(100, 200) },
    });
  }
  let templateBall = `
    <div class="border">
      <div class="ball" style="background-color: \${color}; transform: translate3d(\${ball.position.x}px, \${ball.position.y}px, 0)"></div>
    `;
  for (let i = 0; i < balls; i++) {
    templateBall += `<div class="ball" style="background-color: \${color}; transform: translate3d(\${balls[${i}].position.x}px, \${balls[${i}].position.y}px, 0)"></div>`;
  }
  templateBall += `
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
