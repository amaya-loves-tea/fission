import { isPlainObject, logWarning } from '../util';
import {
  observe,
  setReactivityState,
  addPropertyWatcher,
  removePropertyWatcher,
} from '../observer';
import { ReactivityState, reactivityState } from '../observer/reactivity-state';
import { WatcherFunction } from '../observer/observable';
import { ObservedData } from '../observer/observer';
import { Obj } from '../types';

// Ensure reactivity is disabled
setReactivityState(ReactivityState.Disabled);

/**
 * Signature for a [[Store]] instance.
 *
 * @typeparam T - Plain javascript object that will become the store state.
 */
export interface IStore<T extends Obj> {
  /** Store instance data. */
  readonly $state: T;
  /**
   * Calls a store mutation from the [[Store.$mutations]] map passing in the data the it needs to perform its task.
   *
   * @param mutation - Name of the mutation to call.
   * @param payload - Value to pass to the mutation.
   *
   * @typeparam U - Any valid javascript type.
   */
  $commit<U>(mutation: string, payload?: U): any;
  /**
   * Calls a store action from the [[Store.$actions]] map passing in the data the it needs to perform its task.
   *
   * @param action - Name of the action to call.
   * @param payload - Value to pass to the action.
   *
   * @typeparam U - Any valid javascript type.
   */
  $dispatch<U>(action: string, payload?: U): any;
  /**
   * Add a function to be executed when a [[$state]] property changes.
   *
   * @param propertyPath - Path to the property on [[$state]], if nested use the dot operator for ex `nested.property`.
   * @param watcher - Function to be called when the property at `propertyPath` changes.
   */
  $watch<U>(propertyPath: string, watcher: WatcherFunction<U>): WatcherFunction<U>;
  /**
   * Stop a function from executing when a [[$state]] property changes.
   *
   * @param propertyPath - Path to the property on [[$state]], if nested use the dot operator for ex `nested.property`.
   * @param watcher - Function to be removed from executing when the property at `propertyPath` changes.
   */
  $unwatch<U>(propertyPath: string, watcher: WatcherFunction<U>): void;
}

/**
 * Transforms a [[IStoreOptions]] type into a [[Store]] type.
 *
 * @typeparam T - [[IStoreOptions]] object.
 */
type StoreDefinition<T> = T extends { state: infer A; modules?: infer B }
  ? A extends Obj
    ? IStore<ObservedData<A>> & { [P in keyof B]: StoreDefinition<B[P]> }
    : never
  : never;

/**
 * Signature of the options object used to create a store instance.
 *
 * @typeparam T - Plain javascript object.
 * @typeparam U - Object containing nested [[IStoreOptions]] definitions.
 */
interface IStoreOptions<T extends Obj, U extends Obj> {
  /** Plain javascript object containing data properties. */
  state: T;
  /** Object of function definitions that can synchronously change store state. */
  mutations?: IMutationDefinitions;
  /** Object of function definitions that can run asynchronously to perform some task. */
  actions?: IActionDefinitions;
  /** Object containing [[IStoreOptions]] definitions. */
  modules?: U;
}

/**
 * Signature used to describe mutation definitions.
 */
interface IMutationDefinitions {
  [key: string]: (
    context: {
      $state: any;
      $commit: (...args: any[]) => any;
    },
    payload: any,
  ) => any;
}

/**
 * Signature used to describe action definitions.
 */
interface IActionDefinitions {
  [key: string]: (
    context: { $state: any; $commit: (...args: any[]) => any; $dispatch: (...args: any[]) => any },
    payload: any,
  ) => any;
}

/**
 * State management implementation based on the [vuex](https://vuex.vuejs.org/) API.
 *
 * ## Creating a store instance
 * There are two methods for creating a store instance.
 *
 * You can use the `new` operator with the class or use the static `create` method.
 *
 * The create method only has to be used in a typescript environment to get proper type support on the created store instance.
 *
 * ```typescript
 * const store = new Store(options);
 *
 * // Provides correct type support in a typescript environment
 * const store = Store.create(options);
 * ```
 *
 * ## Options
 *
 * ### State
 * State is a data object that is observed for data changes.
 *
 * ```typescript
 * const store = new Store({
 *   state: {
 *     price: 20,
 *     quantity: 10,
 *     // Computed property that evaluates to the result of calling the function.
 *     // They automatically update when their dependencies update so that they always contain the latest value.
 *     // For example changing either price, qty or both will cause total to be reevaluated.
 *     total(): number {
 *       return this.price * this.quantity;
 *     }
 *   }
 * });
 *
 *  console.log(store.$state); // output: { price: 20, quantity: 10, total: 200 }
 *
 *  // Store state is protected and cannot be set directly, use mutations to change store state.
 *  store.$state.price = 50; // This line will throw an exception.
 * ```
 *
 * ### Mutations
 * Mutations are synchronous functions that can be used change store state.
 *
 * Asynchronous data changes in a mutation will cause an error to occur.
 * If you need to run some workflow that updates store state use a combination of actions and mutations.
 *
 * ```typescript
 *   const store = new Store({
 *     state: {
 *       price: 20,
 *       quantity: 10,
 *       total(): number {
 *         return this.price * this.quantity;
 *       }
 *     },
 *     mutations: {
 *       // All mutations receive a context variable as a first parameter which has been destructured in the following example.
 *       // The second parameter is the payload passed to the mutation which can be any value.
 *       // Use payload as an object if you wish to pass multiple parameters to the mutation.
 *       incrementPriceBy({ $state, $commit }, value){
 *         $state.price += value;
 *
 *         // You can do another commit from this mutation.
 *         $commit('SOME_OTHER_COMMIT', value);
 *
 *         // Mutations can return a result to the caller.
 *         return true;
 *       }
 *   }});
 *
 *  const success = store.$commit('incrementPriceBy', 20);
 *  console.log(success); // output: true
 *  console.log(store.$state); // output: { price: 40, quantity: 10, total: 400 }
 * ```
 *
 * ### Actions
 * Actions are pieces of functionality, often asynchronous, that performs a set of operations or executes a workflow.
 *
 * They cannot modify store state directly and should instead use the `context.commit` parameter to persist data changes.
 *
 * ```typescript
 *   const store = new Store({
 *     state: {
 *       price: 20,
 *       quantity: 10,
 *       total(): number {
 *         return this.price * this.quantity;
 *       }
 *     },
 *     mutations: {
 *       ...
 *     }
 *     actions: {
 *       // All actions receive a context variable as a first parameter which has been destructured in the following example.
 *       // The second parameter is the payload passed to the action which can be any value.
 *       // Use payload as an object if you wish to pass multiple parameters to the action.
 *       setTotal({ $state, $commit, $dispatch }, payload) {
 *         // State in actions are readonly and will cause an error when you try to change a value.
 *         $state.price = 50; // this line throws an exception
 *
 *         // Do some stuff probably asynchronously
 *
 *         // To change state you can use context.commit which is a proxy for [[$commit]].
 *         $commit('setPrice', payload.price);
 *         $commit('setQty', payload.qty);
 *
 *         // You can also call other actions using context.dispatch which is a proxy for [[$dispatch]].
 *         $dispatch('SOME_OTHER_ACTION', 'SOME_OTHER_PAYLOAD');
 *
 *         // Actions can return a value to the caller
 *         return 55;
 *       }
 *       doSomethingAsync({ $state, $commit, $dispatch }, payload) {
 *         // You use promises with actions by returning a Promise
 *         return new Promise((resolve, reject) => {
 *           try {
 *             // Do something
 *
 *             resolve();
 *           }
 *           catch(error) {
 *             reject(error);
 *           }
 *         });
 *       }
 *     }
 *   });
 *
 *  const result = store.$dispatch('setTotal', { price: 50, qty: 30 });
 *  // Ignoring the line that causes an error in the action this would be the output
 *  console.log(result); // output: 55
 *  console.log(store.$state); // output: { price: 50, quantity: 30, total: 1500 }
 *
 *  // Example of using promise based actions
 *  store.$dispatch('doSomethingAsync', 'value').then(value => {
 *    // Do something after promise completes with the resolved value.
 *  });
 * ```
 *
 * ### Modules
 * Modules are a way to define recursive store instances nested under the root store instance.
 *
 * ```typescript
 *  const store = Store.create({
 *    state: {
 *      owner: 'owner'
 *    },
 *    mutations: {},
 *    actions: {},
 *    modules: {
 *      factory: {
 *        state: {
 *          workers: [],
 *          headCount(): number {
 *            return this.workers.length;
 *          },
 *        },
 *        actions: {
 *          addWorker({ state }, payload) {
 *            // Add a worker
 *          },
 *        },
 *        modules: {
 *          shop: {
 *            state: {
 *              employees: [],
 *              manager: 'someone',
 *              headCount(): number {
 *                return this.employees.length + 1;
 *              },
 *            },
 *          },
 *        },
 *      },
 *    }
 *  });
 *
 * // The following shows how you would use the store instances created from these module definitions.
 *
 *  store.$state.owner;
 *  store.$commit('MUTATION_NAME', '');
 *  store.$dispatch('ACTION_NAME', {});
 *
 *  store.factory.$state.headCount;
 *  store.factory.$commit('MUTATION_NAME', {});
 *  store.factory.$dispatch('ACTION_NAME', '');
 *
 *  store.factory.shop.$state.employees;
 *  store.factory.shop.$commit('MUTATION_NAME', []);
 *  store.factory.shop.$dispatch('ACTION_NAME', []);
 * ```
 *
 * @typeparam T - [[IStoreOptions.state]] value in the options object passed to the constructor.
 * @typeparam U - [[IStoreOptions.modules]] value in the options object passed to the constructor.
 */
export default class Store<T extends Obj, U extends Obj> {
  /** Store instance data. */
  public readonly $state!: ObservedData<T>;
  /** Map of mutations that can get invoked using [[$commit]]. */
  private readonly $mutations: IMutationDefinitions;
  /** Map of actions that can get invoked using [[$dispatch]]. */
  private readonly $actions: IActionDefinitions;

  /**
   * @param options - Options to initialize the store instance.
   */
  public constructor(options: IStoreOptions<T, U>) {
    if (isPlainObject(options)) {
      let keys: string[];
      let i: number;

      // Ensure $state cannot be assigned to
      Object.defineProperty(this, '$state', {
        value: observe(options.state || {}),
      });

      // Process actions
      this.$actions = options.actions || {};
      keys = Object.keys(this.$actions);
      for (i = 0; i < keys.length; i++) {
        if (typeof this.$actions[keys[i]] !== 'function') {
          throw new Error(
            `Actions definitions should be functions but '${keys[i]}' is not a function`,
          );
        }
      }
      Object.freeze(this.$actions);

      // Process mutations
      this.$mutations = options.mutations || {};
      keys = Object.keys(this.$mutations);
      for (i = 0; i < keys.length; i++) {
        if (typeof this.$mutations[keys[i]] !== 'function') {
          throw new Error(
            `Mutation definitions should be functions but '${keys[i]}' is not a function`,
          );
        }
      }
      Object.freeze(this.$mutations);

      // process modules
      options.modules = options.modules || ({} as U);
      keys = Object.keys(options.modules);
      for (i = 0; i < keys.length; i++) {
        const module = options.modules[keys[i] as keyof typeof options.modules];
        if (isPlainObject(module)) {
          Object.defineProperty(this, keys[i], {
            value: new Store(module as any),
            enumerable: true,
          });
        } else {
          throw new Error('Modules must be plain javascript options objects');
        }
      }

      // Ensure that $commit and $dispatch have the correct context
      this.$commit = this.$commit.bind(this);
      this.$dispatch = this.$dispatch.bind(this);
    } else {
      throw new Error('Store only accepts a plain javascript options object');
    }
  }

  /**
   * Creates a store instance which has the correct type support for use in typescript environments.
   *
   * @param options - Options to initialize the store instance.
   *
   * @typeparam T - [[IStoreOptions.state]] value in the options object passed to the function.
   * @typeparam U - [[IStoreOptions.modules]] value in the options object passed to the function.
   */
  public static create<T extends Obj, U extends Obj>(
    options: IStoreOptions<T, U>,
  ): StoreDefinition<IStoreOptions<T, U>> {
    return (new Store(options) as unknown) as StoreDefinition<IStoreOptions<T, U>>;
  }

  /**
   * Calls a store [[Store.$mutations]] mutation passing in the data the it needs to perform its task.
   *
   * @param mutation - Name of the mutation to call.
   * @param payload - Value to pass to the mutation.
   *
   * @typeparam U - Any valid javascript type.
   */
  public $commit<U>(mutation: string, payload?: U): void {
    const storeOperation = this.$mutations[mutation];
    if (storeOperation) {
      const lastReactivityState = reactivityState;
      let result;
      try {
        setReactivityState(ReactivityState.Enabled);
        result = storeOperation.call(
          undefined,
          {
            $state: this.$state as T,
            $commit: this.$commit,
          },
          payload,
        );
        // eslint-disable-next-line no-useless-catch
      } catch (error) {
        throw error;
      } finally {
        setReactivityState(lastReactivityState);
      }
      return result;
    } else {
      logWarning(`Mutation with key '${mutation}' does not exist`);
    }
  }

  /**
   * Calls a store [[Store.$actions]] action passing in the data the it needs to perform its task.
   *
   * @param action - Name of the action to call.
   * @param payload - Value to pass to the action.
   *
   * @typeparam U - Any valid javascript type.
   */
  public $dispatch<U>(action: string, payload?: U): any {
    const storeOperation = this.$actions[action];
    if (storeOperation) {
      return storeOperation.call(
        undefined,
        {
          $state: this.$state,
          $commit: this.$commit,
          $dispatch: this.$dispatch,
        },
        payload,
      );
    } else {
      logWarning(`Action with key '${action}' does not exist`);
    }
  }

  /**
   * Add a function to be executed when a [[$state]] property changes.
   *
   * @param propertyPath - Path to the property on [[$state]], if nested use the dot operator for ex `nested.property`.
   * @param watcher - Function to be called when the property at `propertyPath` changes.
   */
  public $watch<U>(propertyPath: string, watcher: WatcherFunction<U>): WatcherFunction<U> {
    return addPropertyWatcher(this.$state, propertyPath, watcher);
  }

  /**
   * Stop a function from executing when a [[$state]] property changes.
   *
   * @param propertyPath - Path to the property on [[$state]], if nested use the dot operator for ex `nested.property`.
   * @param watcher - Function to be removed when the property at `propertyPath` changes.
   */
  public $unwatch<U>(propertyPath: string, watcher: WatcherFunction<U>): void {
    removePropertyWatcher(this.$state, propertyPath, watcher);
  }
}
