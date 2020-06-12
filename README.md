# Fission

[![build: status](https://travis-ci.org/amaya-loves-tea/fission.svg?branch=master)](https://travis-ci.org/amaya-loves-tea/fission)
[![codecov: percent](https://codecov.io/gh/amaya-loves-tea/fission/branch/master/graph/badge.svg)](https://codecov.io/gh/amaya-loves-tea/fission)
[![commitizen: friendly](https://img.shields.io/badge/commitizen-friendly-brightgreen.svg)](http://commitizen.github.io/cz-cli/)
[![code style: prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg?style=flat-square)](https://prettier.io/)
[![semantic-release](https://img.shields.io/badge/%20%20%F0%9F%93%A6%F0%9F%9A%80-semantic--release-e10079.svg)](https://semantic-release.gitbook.io/semantic-release/)
[![linter: eslint](https://img.shields.io/badge/linter-eslint-blue.svg)](https://github.com/typescript-eslint/typescript-eslint)
[![docs: gh-pages](https://img.shields.io/badge/docs-gh--pages-blue.svg)](https://amaya-loves-tea.github.io/fission/)
[![npm (scoped)](https://img.shields.io/npm/v/@teasenshi/fission?label=npm%20package)](https://www.npmjs.com/package/@teasenshi/fission)

State management library for ES5+ environments designed for ease of use.

## Recommended IDE

You should be using [Visual Studio Code](https://code.visualstudio.com/) because its simple, fast, extensible and beloved by many developers.

Make sure to install all the [recommended extensions](https://code.visualstudio.com/docs/editor/extension-gallery#_recommended-extensions) that come with the repository for the best possible coding experience.

## NPM Scripts

Note that these examples use yarn but you can use the equivalent `npm run <command>` instead.

Most of them will automatically run when you perform certain actions on your repository.

### Code style

Ensures code consistency in your code base.

These commands automatically get run before commits.

- `yarn style` - Runs all style:\* commands.
- `yarn style:lint` - Lints your code using [eslint](https://github.com/typescript-eslint/typescript-eslint).
- `yarn style:format` - Formats your code using [prettier](https://prettier.io/).

### Build Tasks

Creates builds from your Typescript files for [CommonJS (cjs)](https://flaviocopes.com/commonjs/) and [ES6 modules (esm)](https://exploringjs.com/es6/ch_core-features.html#sec_from-cjs-to-esm).

- `yarn build` - Runs all build commands which creates builds for different node environments.
- `yarn build:main` - Creates a build using cjs modules.
- `yarn build:module` - Creates a build using esm modules.

### Testing

Ensures code is reliable by running your [jest](https://jestjs.io/en/) unit tests.

Unit tests automatically get run before commits.

- `yarn test` - Runs all tests and generates a code coverage report.
- `yarn test:watch` - Watches file changes and reruns tests for those changed files.

### Code Coverage

Generates and publishes documentation based on your [typedoc](https://typedoc.org/) comments.

- `yarn cov` - Generate a code coverage report.
- `yarn cov:open` - Open generated code coverage report.
- `yarn cov:publish` - Publish generated code coverage reports to [codecov](https://codecov.io/).
  Running this command locally will require the upload token for e.g `yarn cov:publish --token="YOUR_TOKEN_HERE"`

### Documentation

Generate and publishing documentation based on your [typedoc](https://typedoc.org/) comments.

- `yarn doc` - Generates documentation from code.
- `yarn doc:open` - Opens generated documentation in your default browser.
- `yarn doc:publish` - Publishes generated documentation.

### Helpers

These commands perform misc tasks.

- `yarn commit` - Create a new commit using the [commitizen](https://github.com/commitizen/cz-cli) cli.
- `yarn clean` - Cleans up all build artifacts such as the distribution folder.

## Conventional Commits

Commit messages to this repository that don't follow the [conventional commit guidelines](https://www.conventionalcommits.org/en/) will be rejected by a `commit-msg` [git hook](#Git-Hooks).

No one likes rejection so use the `yarn commit` script which provides a CLI interface for creating formated commits.

## Git Hooks

If you would like to run custom tasks during important actions on a repository you can use [git hooks](https://git-scm.com/book/en/v2/Customizing-Git-Git-Hooks).

To make this as simple as possible we use [husky](https://github.com/typicode/husky) which is also used in the [conventional commits toolchain](#Conventional-Commits).

## Debugging

The following [launch configurations](https://code.visualstudio.com/docs/editor/debugging) will assist with debugging your library.

- `Current TS File` - debug current typescript file.
- `Current Jest Test` - debug current jest test.
- `All Jest Tests` - debug all jest tests.

## Usage

### Creating a store instance

There are 2 methods for creating a store instance. The one you end up using depends on whether or not you are using typescript.

```typescript
import Store from '@teasenshi/fission';

// Use in javascript environments
const store = new Store(options);

// Use in Typescript environments which provides proper type support on the store instance
const store = Store.create(options);
```

### Store state

Store state is readonly data stored on the store instance. You specify store state by adding a `state` property in the options object passed to the store constructor.

```typescript
const store = new Store({
  state: {
    price: 55,
    qty: 10,
    shouldFormat: false,
    total() {
      return this.price * this.qty;
    },
    totalTimesFive() {
      return this.total * 5;
    },
    formattedTotal() {
      if (this.shouldFormat) {
        // return a formatted currency string
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
        }).format(this.total);
      } else {
        return 'formatting disabled';
      }
    },
    shortCircuiting() {
      return this.price > 60 && this.qty > 20;
    },
  },
});

console.log(store.$state); // output: { price: 55, qty: 10, total: 550, totalTimesFive: 2750, formattedTotal: 'formatting disabled',  }

// This line throws an exceptions as store state cannot be set directly.
store.$state.price = 55;
```

#### Computed Properties

The function definitions in the example above are computed properties/values.
When you use other properties in a computed property definition they are registered as dependencies.
Changing dependencies causes a computed property to automatically reevaluate.

##### Chained Computed Properties

`totalTimesFive` is a chained computed property. When `total` changes, i.e when `price` and/or `qty` change, it will cause `totalTimesFive` to change as well.

The order in which you declare them are important. For example declaring `totalTimesFive` before `total` will not work since `total` is undefined when `totalTimesFive` is created!

##### Caveats

`formattedTotal` demonstrates an important consideration when creating computed properties.

Since both `shouldFormat` and `total` are used in that function you would expect that changing either would cause it to be reevaluated.

Unfortunately this is not the case since the first time this function runs `shouldFormat` is false and the function will never **reach** `total`. In this case only changes to `shouldFormat` will cause it to be reevaluated.

Issues like these can be solved by refactoring the function in a way that all properties are reachable the first time it runs.

In `formattedTotal` you can for example add `total` to the if condition `if(this.total && this.shouldFormat)`.

`shortCircuiting` demonstrates the same issue due to [conditional short circuiting](#https://codeburst.io/javascript-short-circuit-conditionals-bbc13ac3e9eb#targetText=Short%20circuiting%20means%20that%20in,first%20operand%20must%20be%20true.).

In this case, changes to `qty` will not cause `shortCircuiting` to be reevaluated. This is because the first time this function is evaluated `price < 60` so the condition short circuits and qty is never reached.

### Mutations

Mutations are synchronous functions that have the ability to change the store state. They are committed (run) using the `store.$commit` method.

```typescript
const store = new Store({
  state: {
    ...
  },
  mutations: {
    /*
     'context' is an object containing a reference to some store instance members.
     'payload' is any value that can be passed to the mutation by the user.
    */
    setPrice(context, payload) {
      context.$state.price = payload;
    },
    // Destructured context variable
    setQty({ $state }, value) {
      $state.qty = value;
    },
     // Mutations can return a value to the caller
    doSomethingAndReturn({ $state }, value) {
      // Do something...

      return value;
    }
    // The context parameter also contains a reference to the $commit function.
    doSomethingAndCommit({ $state, $commit }, value) {
      // Do stuff

      // Commit another mutation
      $commit('setQty', value);
    }
    // Mutations cannot asynchronously change store state
    invalidAsync({ $state }, value) {
      $state.price = 100; // Ok
      setTimeout(() => {
        $state.qty = value; // This line will cause an exception
      }, 100);
    }
  }
});

// Simple commit
store.$commit('setPrice', 22);
console.log(store.$state.price); // output: 22

// Store the result of committing the mutation
const result = store.commit('doSomethingAndReturn', 'A VALUE');
console.log(result); // output: "A VALUE"
```

### Actions

Actions are functions that can be used to control some process or workflow, often asynchronously. They are dispatched (run) using the `store.$dispatch` method.

Actions cannot set store state directly but are able to call commits from within them to achieve the same result.

```typescript
const store = new Store({
  state: {
    ...
  },
  mutations: {
    ...
  },
  actions: {
    // State is readonly in an action.
    invalidAction({ $state }, value) {
      $state.price = 100; // This line will cause an exception
    },
    // You can commit and dispatch from an action
    setTotal({ $commit, $dispatch }, payload) {
      // Do something with payload perhaps asynchronously persisting it to a server

      // Persist data to store using commit
      $commit('setTotal', payload);

      // Trigger another action
      $dispatch('totalSet');
    },
    /*
      Actions can also return values to the caller.
      You can use this capability to make them asynchronous using ES6 promises or generators
    */
    doSomethingAsync(context, payload) {
      return new Promise((resolve, reject) => {
        try {
          // Do something
          resolve();
        }
        catch {
          reject();
        }
      });
    }
  }
});

// Simple action
store.$dispatch('setTotal', {price: 50, qty: 15});

// Promise based action
store.dispatch('doSomethingAsync').then(value => {
  // Do something
});
```

### Watchers

Watchers are functions that get called when a state property changes. You can add/remove watchers from properties using `store.$watch` and `store.$unwatch` respectively.

```typescript
const store = new Store({
  state: {
    products: {
      stock: [
        { name: 'jelly', price: 20, qty: 100 },
        { name: 'mouse', price: 55, qty: 5 },
      ],
      lowStockItems() {
        return stock.filter((x) => x.qty < 10).map((x) => x.name);
      },
    },
  },
});

/*
  The following example watches a nested property.
  When that property changes the watcher function will get called.

  $watch expects the path to the property as a first parameter and the watcher function as a second 
  and returns a reference to the watcher function.
*/
const watcher = store.$watch('products.lowStockItems', (value, oldValue) => {
  console.log(value, oldValue);
});

// Remove 95 jelly from stock, jelly should now be a `lowStockItem` and the watcher will be called.
store.commit('removeStock', { name: 'jelly', amount: 95 }); // output: ['jelly', 'mouse'] ['jelly']

// Stop watching changes to 'lowStockItems'
store.$unwatch('products.lowStockItems', watcher);

// Since watcher is removed there is no output
store.commit('addStock', { name: 'jelly', amount: 95 });
```

### Modules

Modules are a way to define nested store instances.

```typescript
const store = new Store({
  // Root store instance
  state: {...},
  mutations: {...},
  actions: {...},
  modules: {
    // Factory module
    factory: {
      state: {...},
      mutations: {...},
      actions: {...},
      modules: {
        // Shop module
        shop: {
          state: {...},
          mutations: {...},
          actions: {...},
        }
      }
    }
  }
});

// Usage examples
// Root store
store.$state.name;
store.$commit('MUTATION_NAME', '');
store.$dispatch('ACTION_NAME', {});

// Root.Factory module
store.factory.$state.headCount;
store.factory.$commit('MUTATION_NAME', {});
store.factory.$dispatch('ACTION_NAME', '');

// Root.Factory.Shop module
store.factory.shop.$state.employees;
store.factory.shop.$commit('MUTATION_NAME', []);
store.factory.shop.$dispatch('ACTION_NAME', []);
```
