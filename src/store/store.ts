/* eslint @typescript-eslint/interface-name-prefix: "warn" */
import { isPlainObject, logWarning } from '../util';
import {
  observe,
  processReactivityQueue,
  purgeReactivityQueue,
  setReactivityState,
  addPropertyWatcher,
  removePropertyWatcher,
} from '../observer';
import { ReactivityState, reactivityState } from '../observer/reactivity-state';
import { WatcherFunction } from '../observer/observable';
import { ObservedData } from '../observer/observer';

interface IStore<T extends object> {
  $state: ObservedData<T>;
  $dispatch<U>(action: string, payload?: U): void;
  $watch<U>(path: string, watcher: WatcherFunction<U>): WatcherFunction<U>;
  $unwatch<U>(path: string, watcher: WatcherFunction<U>): void;
}

type StoreDefinition<T> = T extends { state: infer A; modules?: infer B }
  ? A extends object
    ? IStore<A> & StoreMap<B>
    : never
  : never;

type StoreMap<T> = { [P in keyof T]: StoreDefinition<T[P]> };

interface IStoreOptions<T extends object, U extends object> {
  state: T;
  actions?: IActionDefinitions;
  modules?: U;
}

interface IActionDefinitions {
  [key: string]: (
    context: { state: any; commit: () => void; discard: () => void },
    payload: any,
  ) => any;
}

export default class Store<T extends object, U extends object> {
  public $state: ObservedData<T>;
  private _actions: IActionDefinitions;

  public constructor(options: IStoreOptions<T, U>) {
    if (isPlainObject(options)) {
      let keys: string[];
      let i: number;
      this.$state = observe(options.state || {}) as ObservedData<T>;

      // process actions
      this._actions = options.actions || {};
      keys = Object.keys(this._actions);
      for (i = 0; i < keys.length; i++) {
        if (typeof this._actions[keys[i]] !== 'function') {
          throw new Error(
            `Actions definitions should be functions but '${keys[i]}' is not a function`,
          );
        }
      }

      // process modules
      // eslint-disable-next-line @typescript-eslint/no-object-literal-type-assertion
      options.modules = options.modules || ({} as U);
      keys = Object.keys(options.modules);
      for (i = 0; i < keys.length; i++) {
        const module = options.modules[keys[i] as keyof typeof options.modules];
        if (isPlainObject(module)) {
          Object.defineProperty(this, keys[i], { value: new Store(module) });
        } else {
          throw new Error('Modules must be plain javascript options objects');
        }
      }
    } else {
      throw new Error('Store only accepts a plain javascript options object');
    }
  }

  public static create<T extends object, U extends object>(
    options: IStoreOptions<T, U>,
  ): StoreDefinition<IStoreOptions<T, U>> {
    return (new Store(options) as unknown) as StoreDefinition<IStoreOptions<T, U>>;
  }

  public $dispatch<U>(action: string, payload?: U): any {
    const callback = this._actions[action];
    if (callback) {
      const currentReactivityState = reactivityState;
      // collect all data changes in the callback function in a reactivity queue
      setReactivityState(ReactivityState.Lazy);
      const result = callback.call(
        undefined,
        {
          state: this.$state,
          commit: processReactivityQueue,
          discard: purgeReactivityQueue,
        },
        payload,
      );
      // run all data change actions in the reactivity queue
      processReactivityQueue();
      setReactivityState(currentReactivityState);
      return result;
    } else {
      logWarning(`Action with key '${action}' does not exist`);
    }
  }

  public $watch<U>(propertyPath: string, watcher: WatcherFunction<U>): WatcherFunction<U> {
    return addPropertyWatcher(this.$state, propertyPath, watcher);
  }

  public $unwatch<U>(propertyPath: string, watcher: WatcherFunction<U>): void {
    removePropertyWatcher(this.$state, propertyPath, watcher);
  }
}
