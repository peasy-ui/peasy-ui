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
    list: ['one', 'two', 'three'],
    left: false,
    right: true,
    demo: 'card',
    clicked: (_event, model, _boundElement, _boundEvent) => model.color = 'gold',
    changed: (_ev, model, element) => {
      demoUI = selectDemo(model, demoUI);
    },
    card: {
      value: 'The Ace',
      position: { x: 50, y: 25 },
      faceUp: false,
      get rotateY() { return this.faceUp ? 0 : 180; },
      flip: () => model.card.faceUp = !model.card.faceUp,
    },
    balls: [],
    todos: [],
    get remainingTodos() { return model.todos.filter(todo => !todo.done) },
    get doneTodos() { return model.todos.filter(todo => todo.done) },
    addTodo: (_event, model) => {
      model.todos.push({ text: model.todo, done: false });
      model.todo = '';
      model.inputElement.focus();
      console.log(model);
    },
    removeTodo: (_event, model, _element, _at, context) => {
      console.log(model, _at, context);
      context.$parent.$model.todos = context.$parent.$model.todos.filter(todo => todo !== model.todo);
    },

    // slots: [],
  };


  UI.create(document.body, `
    <div class="main" style="background-color: \${color};"> 
      <div \${item <=* list} style="background-color: \${color};">Item: \${item} <button \${click @=> clicked}>Set to gold (\${item})</button></div>
      List: \${list[1]}
      <div>Color: <input \${value <=> color}> <span>The color is <b>\${color}</b>.</span> <button \${click @=> clicked}>Set to gold</button></div>
      <div>Checks: <label><input type="checkbox" \${checked <=> left}> Left</label> <label><input type="checkbox" \${checked <=> right}> Right</label> <b>\${left} \${right}</b></div>
      <div>Demo: 
        <label><input type="radio" name="demo" \${'card' ==> demo} \${change @=> changed}>Card</label>
        <label><input type="radio" name="demo" \${'ball' ==> demo} \${change @=> changed}>Ball</label> 
        <label><input type="radio" name="demo" \${'todo' ==> demo} \${change @=> changed}>Todo</label> 
        <b>\${demo}</b>
       </div>
      <div>Demo: 
        <select \${change @=> changed} \${ ==> demoElement}>
          <option \${'card' ==> demo}>Card</option>
          <option \${'ball' ==> demo}>Ball</option>
          <option \${'todo' ==> demo}>Todo</option>
        </select>
       <b>\${demo}</b>
      </div>
   </div>
   `, model);

  console.log('model', model);

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
  setTimeout(() => model.color = 'skyblue', 4000);
  // setTimeout(() => model.list = model.list.concat({ id: 'four' }), 6000);
  setTimeout(() => model.list.push('four'), 6000);
  setTimeout(() => { const list = model.list;[list[1], list[2]] = [list[2], list[1]]; }, 7000);
  setTimeout(() => { model.list = model.list.filter(item => item !== 'three') }, 8000);

  setInterval(() => model.card.flip(), 2500);

  // setInterval(() => {
  //   const item = itemsShift(model.slots);
  //   setTimeout(() => {
  //     // itemsPush(model.slots, item);
  //   }, 1000);
  // }, 2000);

  setInterval(() => {
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

  const templateBall = `
    <div class="border">
      <div class="ball" \${ball <=* balls} style="background-color: \${color}; transform: translate3d(\${ball.position.x}px, \${ball.position.y}px, 0)"></div>
    </div>
    `;

  const templateTodo = `
    <div class="todos">
      <div class="input"><input \${value <=> todo} \${==> inputElement}> <button \${click @=> addTodo}>Add todo</button></div>
      <div class="header" >Remaining</div>
      <div class="todo remaining-todo" \${todo <=* remainingTodos} style="background-color: \${color};"><label><input type="checkbox" \${checked <=> todo.done}> \${todo.text}</label> <button \${click @=> removeTodo}>Remove todo</button></div>
      <div class="header" >Done</div>
      <div class="todo done-todo" \${todo <=* doneTodos} style="background-color: \${color};"><label><input type="checkbox" \${checked <=> todo.done}> \${todo.text}</label> <button \${click @=> removeTodo}>Remove todo</button></div>
    </div>
    `;


  if (demoUI != null) {
    demoUI.destroy();
  }
  let template;
  switch (model.demo) {
    case 'ball':
      template = templateBall;
      break;
    case 'card':
      template = templateCard;
      break;
    case 'todo':
      template = templateTodo;
      break;
  }
  demoUI = UI.create(document.body, template, model);

  return demoUI;
}

function random(min, max) {
  return Math.floor(Math.random() * (max - min) + min);
}
