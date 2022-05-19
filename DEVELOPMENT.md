# Peasy UI

## Start dev web server

    npm start

Note that Peasy UI comes with a dev-app. The above command starts the dev app in `dev-app/` folder. The plugin source code is in `src/` folder.

## Build Peasy UI production modern

    npm run build

It builds Peasy UI into `dist/index.js` file.

Note when you do `npm publish` or `npm pack` to prepare the Peasy UI package, it automatically runs the above build command by the `prepare` script defined in your `package.json` `"scripts"` section.

## Consume the Peasy UI

Peasy UI is published to npm so just install the `package.json`

    npm install peasy-ui

If you want to directly use plugin's git repo.

    npm install git@github.com:username/peasy-ui.git

or

    npm install https://some.git.server/username/peasy-ui.git

If you want to install from local folder, don't do "npm install ../local/peasy-ui/" as the folder's `node_modules/` might cause webpack to complain. Instead, do

    npm pack

which will pack Peasy UI into `peasy-ui` to be consumed with

```ts
import * as UI from 'peasy-ui';
```

## Analyze webpack bundle

    npm run analyze

## Acknowledgements

Peasy UI's project structure is derived from [aurelia/new](https://github.com/aurelia/new).
