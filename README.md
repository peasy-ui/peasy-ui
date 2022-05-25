# Peasy UI

This is the repository for Peasy UI, a small-ish and relatively easy to use UI binding library.

## Introduction

Peasy UI provides uncomplicated UI bindings for HTML via string templating. It's intended to be used in vanilla JavaScript/Typescript projects where using `createElement` is too cumbersome and adding a complete SPA framework is overkill or simply not desired. Thanks to the small scope of the library, performance is decent.

## First look

In Peasy UI, an HTML template is combined with a JavaScript/Typescript object, the model, into a `UI View` that's added to an element. By calling `update()` on the view, typically after updating the model or in a recurring (game) loop, the one-way, two-way and event bindings will sync state between the UI and the model.

```ts
const template = `
    Color: <input \${value <=> color}>
    <span style="background-color: \${color}">\${color}</span>
    <button \${click @=> clicked}>Gold</button>
    `;

const model = {
    color: 'red';
    clicked: () => model.color = 'gold';
};

const view = UI.create(document.body, template, model);

setInterval(() => UI.update(), 1000 / 30);
```
This example creates a two-way bound input field where whatever color is typed in is displayed in a span with that background color. When the button Gold is clicked, the click event binding will update the color property in the model which in turn will update all bindings in the view. The update in the `setInterval` at the end causes the bindings to be checked and updated 30 times per second.

## Getting started

If you've got a build process and are using npm, install Peasy UI with

    npm i peasy-ui

and `import` it into whichever files you want to use it

```ts
import { UI } from 'peasy-ui';
```

If you don't have a build process or don't want to install it, use a `script` tag

```html
<script src="https://unpkg.com/peasy-ui">
```
to make `UI` available.

## Features and syntax

Peasy UI uses the JavaScript/Typescript string interpolation syntax of `${ }` in combination with different versions of the spaceship operator `<=>` to bind between an `attribute` on the element and a `property` on the model.

```ts
'Color: <input ${value <=> color}>' // Two-way binding between value attribute and color property
```
### Available bindings

    ${attr <=> prop}    Two-way binding between element attribute and model property
    ${attr ==> prop}    One-way bindning from element attribute to model property 
    ${attr <== prop}    One-way bindning from model property to element attribute

    ${prop}             One-way bindning from model property to attribute or text

    ${event @=> method} Event bindning from element attribute to model method

    ${'value' ==> prop} One-way binding from element to model property, used to bind
                        values of radio buttons and select inputs to a model property

    ${ ==> prop}        One-time binding that stores DOM element in model property

A combination of the string value binding and a binding for the `change` event can be used to capture and react to changes in radio buttons and selects.

```ts
const template = `
    <input type="radio" \${'red' ==> color} \${change @=> changedColor}> Red
    <input type="radio" \${'green' ==> color} \${change @=> changedColor}> Green
    `;

const model = {
    color: 'red';
    changedColor: (event, model) => alert(`Changed color to ${model.color}.`),
};
```

```ts
const template = `
    <select \${change @=> changedColor}>
        <option \${'red' ==> color}>Red</option>
        <option \${'green' ==> color}>Green</option>
    </select>
    `;

const model = {
    color: 'red';
    changedColor: (event, model) => alert(`Changed color to ${model.color}.`),
};
```

## Development and contributing

If you're interested in contributing, please see the [development guidelines](DEVELOPMENT.md).
