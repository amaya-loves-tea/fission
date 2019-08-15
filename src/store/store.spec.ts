import { processReactivityQueue, purgeReactivityQueue } from '../observer';
import {
  reactivityState,
  ReactivityState,
  REACTIVITY_DISABLED_EXCEPTION,
} from '../observer/reactivity-state';
import consoleReference from 'console';
import Store from './store';

global.console = consoleReference;

describe('Store', () => {
  beforeAll(() => {
    consoleReference.warn = jest.fn();
  });

  describe('constructor', () => {
    describe('it uses an options object to initialise its data', () => {
      describe('options.state', () => {
        it('gets assigned to the store $state property', () => {
          const options = createStoreOptions();
          const store = new Store(options);

          expect(store.$state).toBeDefined();
          expect(options.state).toBe(store.$state);
        });

        it('is turned into reactive data using observe', () => {
          const store = Store.create(createStoreOptions());
          Object.keys(store.$state).forEach(key => {
            const descriptor: any = Object.getOwnPropertyDescriptor(store.$state, key);
            expect(descriptor.get.name).toBe('reactiveGetter');
            expect(descriptor.set.name).toBe('reactiveSetter');
          });
        });

        it('fails if state is not an object', () => {
          const options: any = createStoreOptions();
          options.state = 'test';

          expect(() => new Store(options)).toThrow();
        });

        it('is optional and will be set to an empty object if not provided', () => {
          const store = new Store({} as any);

          expect(store.$state).toEqual({});
        });
      });

      describe('options.actions', () => {
        it('gets assigned to the store _actions private property', () => {
          const options = createStoreOptions();
          const store: any = new Store(options);
          expect(store._actions).toBeDefined();
          expect(store._actions).toBe(options.actions);
        });

        it('throws an error if the properties are not function definitions', () => {
          const options: any = createStoreOptions();
          options.actions.nonFunction = 'test';
          expect(() => new Store(options)).toThrowError(
            "Actions definitions should be functions but 'nonFunction' is not a function",
          );
        });
      });

      describe('options.modules', () => {
        it('recursively registers modules as new Stores on the instance', () => {
          const options = createStoreOptions();
          const store: any = new Store(options);

          expect(store.humanResources).toBeDefined();
          expect(store.humanResources.feedback).toBeDefined();

          expect(store.humanResources).toBeInstanceOf(Store);
          expect(store.humanResources.feedback).toBeInstanceOf(Store);
        });

        it('throws an error if a module definition is not a plain javascript object', () => {
          const options: any = createStoreOptions();
          options.modules.nonObjectDefinition = 'test';
          expect(() => new Store(options)).toThrowError(
            'Modules must be plain javascript options objects',
          );
        });
      });
    });

    it('throws an error if the parameter passed in is not a plain options object', () => {
      expect(() => new Store('test' as any)).toThrowError(
        'Store only accepts a plain javascript options object',
      );
    });
  });

  describe('create', () => {
    it('is a static method that creates typescript friendly store instances', () => {
      expect(Store.create({} as any)).toEqual(new Store({} as any));
    });
  });

  describe('$dispatch', () => {
    it('calls a store action passing in various parameters needed by the action', () => {
      const options = createStoreOptions();
      options.actions.addStockItem = jest.fn(options.actions.addStockItem);
      const store = Store.create(options);
      const payload = {
        price: 56,
        qty: 2,
        total(): number {
          return this.price * this.qty;
        },
      };

      store.$dispatch('addStockItem', payload);

      expect(options.actions.addStockItem).toBeCalledTimes(1);
      expect(options.actions.addStockItem).toBeCalledWith(
        { state: store.$state, commit: processReactivityQueue, discard: purgeReactivityQueue },
        payload,
      );
    });

    it('creates a warning when calling an action that does not exist', () => {
      const store = Store.create(createStoreOptions());
      store.$dispatch('DOES NOT EXST');
      expect(consoleReference.warn).toBeCalledTimes(1);
    });

    test('using the context.commit parameter immediately commits all changes done up to that point in the action', () => {
      const options: any = createStoreOptions();
      options.actions.earlyCommit = (context: any, payload: any) => {
        context.state.supplier = payload.supplier;
        expect(context.state.supplier).not.toBe(payload.supplier);
        context.commit();
        expect(context.state.supplier).toBe(payload.supplier);
      };
      const store = Store.create(options);
      store.$dispatch('earlyCommit', { supplier: 'june supplies' });
    });

    test('using the context.discard parameter discards changes in the action up to that point', () => {
      const options: any = createStoreOptions();
      options.actions.earlyCommit = (context: any, payload: any) => {
        context.state.supplier = payload.supplier;
        expect(context.state.supplier).not.toBe(payload.supplier);
        context.discard();
        expect(context.state.supplier).not.toBe(payload.supplier);
      };
      const store = Store.create(options);
      store.$dispatch('earlyCommit', { supplier: 'june supplies' });
    });

    it('sets reactivity state to lazy while executing the action and back to whatever it as before executing the action', () => {
      const options: any = createStoreOptions();
      const currentReactivityState = reactivityState;
      options.actions.reactivityState = (): void => {
        expect(reactivityState).toBe(ReactivityState.Lazy);
      };
      expect(reactivityState).toBe(currentReactivityState);
    });

    it('processes the reactivity queue once the action completes', () => {
      const options: any = createStoreOptions();
      options.actions.reactivityQueue = (context: any, payload: any) => {
        context.state.name = payload.name;
        context.state.stock = payload.stock;

        expect(context.state.name).not.toBe(payload.name);
        expect(context.state.name).not.toBe(payload.stock);
      };
      const store: any = new Store(options);
      const payload = { name: 'unknown wholesalers', stock: [] };
      store.$dispatch('reactivityQueue', payload);
      expect(store.$state.name).toBe(payload.name);
      expect(store.$state.stock).toBe(payload.stock);
    });

    it('returns the result of executing the action', () => {
      const options: any = createStoreOptions();
      options.actions.result = () => 'string return value';
      const store = Store.create(options);
      expect(store.$dispatch('result', undefined)).toBe('string return value');
    });
  });

  describe('$watch', () => {
    it('adds a watcher function to be executed when the state value changes', () => {
      const store = Store.create(createStoreOptions());
      const watcher = jest.fn();
      store.$watch('name', watcher);
      store.$dispatch('changeName', 'NEW STORE NAME');
      expect(watcher).toBeCalledWith('NEW STORE NAME', 'random wholesalers');
    });

    it('returns the watcher function reference so it can be unwatched', () => {
      const store = Store.create(createStoreOptions());
      const watcher = jest.fn();
      expect(store.$watch('name', watcher)).toBe(watcher);
    });
  });

  describe('$unwatch', () => {
    it('removes a watcher function from being executed when the state value changes', () => {
      const store = Store.create(createStoreOptions());
      const watcher = jest.fn();
      store.$watch('name', watcher);
      store.$dispatch('changeName', 'NEW STORE NAME');
      expect(watcher).toBeCalledWith('NEW STORE NAME', 'random wholesalers');

      watcher.mockClear();
      store.$unwatch('name', watcher);
      store.$dispatch('changeName', 'another new store name');
      expect(watcher).not.toBeCalled();
    });
  });

  test('store state can not be set outside of actions', () => {
    const store = Store.create(createStoreOptions());
    expect(() => (store.$state.name = '__NEW_NAME__')).toThrowError(REACTIVITY_DISABLED_EXCEPTION);
  });
});

function createStoreOptions() {
  return {
    state: {
      name: 'random wholesalers',
      supplier: 'jueliar',
      stock: [
        {
          price: 55,
          qty: 10,
          total(): number {
            return this.price * this.qty;
          },
        },
      ],
    },
    actions: {
      changeName(ctx: any, name: string) {
        ctx.state.name = name;
      },
      addStockItem(ctx: any, item: any) {
        ctx.state.stock.push(item);
      },
    },
    modules: {
      humanResources: {
        state: {
          managers: ['jake', 'joan'],
          employees: ['john', 'jill', 'billy'],
          headCount(): number {
            return this.managers.length * this.employees.length;
          },
        },
        modules: {
          feedback: {
            complaints: [],
            compliments: [],
          },
        },
      },
    },
  };
}
