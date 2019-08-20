import {
  reactivityState,
  ReactivityState,
  REACTIVITY_DISABLED_EXCEPTION,
} from '../observer/reactivity-state';
import consoleReference from 'console';
import Store from './store';

global.console = consoleReference;

describe('Store', () => {
  beforeEach(() => {
    consoleReference.warn = jest.fn();
    consoleReference.error = jest.fn();
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
        it('gets assigned to the store $actions private property', () => {
          const options = createStoreOptions();
          const store: any = new Store(options);
          expect(store.$actions).toBeDefined();
          expect(store.$actions).toBe(options.actions);
        });

        it('throws an error if the properties are not function definitions', () => {
          const options: any = createStoreOptions();
          options.actions.nonFunction = 'test';
          expect(() => new Store(options)).toThrowError(
            "Actions definitions should be functions but 'nonFunction' is not a function",
          );
        });
      });

      describe('options.mutations', () => {
        it('gets assigned to the store $mutations private property', () => {
          const options = createStoreOptions();
          const store: any = new Store(options);
          expect(store.$mutations).toBeDefined();
          expect(store.$mutations).toBe(options.mutations);
        });

        it('throws an error if the properties are not function definitions', () => {
          const options: any = createStoreOptions();
          options.mutations.nonFunction = 'test';
          expect(() => new Store(options)).toThrowError(
            "Mutation definitions should be functions but 'nonFunction' is not a function",
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

  describe('$commit', () => {
    it('calls a store mutation passing in various parameters needed by the mutation', () => {
      const options = createStoreOptions();
      options.mutations.addStockItem = jest.fn(options.mutations.addStockItem);
      const store = Store.create(options);
      const payload = {
        price: 56,
        qty: 2,
        total(): number {
          return this.price * this.qty;
        },
      };

      store.$commit('addStockItem', payload);

      expect(options.mutations.addStockItem).toBeCalledTimes(1);

      const context = (options.mutations.addStockItem as any).mock.calls[0][0];
      expect(context.state).toBe(store.$state);

      const data = (options.mutations.addStockItem as any).mock.calls[0][1];
      expect(data).toBe(payload);
    });

    it('creates a warning when calling a mutation that does not exist', () => {
      const store = Store.create(createStoreOptions());
      store.$commit('DOES NOT EXST');
      expect(consoleReference.warn).toBeCalledTimes(1);
      expect(consoleReference.warn).toBeCalledWith(
        "[Reactivity Warning]: Mutation with key 'DOES NOT EXST' does not exist",
      );
    });

    it('sets reactivity state to enabled while executing the mutation and disables it again after it executes', () => {
      const options: any = createStoreOptions();
      options.mutations.reactivityState = (): void => {
        expect(reactivityState).toBe(ReactivityState.Enabled);
      };
      expect(reactivityState).toBe(ReactivityState.Disabled);
    });

    it('throws an error when the mutation fails to evaluate', () => {
      const options: any = createStoreOptions();
      options.mutations.errorMutation = () => {
        throw new Error('test');
      };
      const store = new Store(options);
      expect(() => store.$commit('errorMutation')).toThrowError('test');
    });

    it('returns the result of executing the mutation', () => {
      const options: any = createStoreOptions();
      options.mutations.result = () => 'string return value';
      const store = Store.create(options);
      expect(store.$commit('result', undefined)).toBe('string return value');
    });
  });

  describe('$dispatch', () => {
    it('calls a store action passing in various parameters needed by the action', () => {
      const options = createStoreOptions();
      options.actions.changeNameAsync = jest.fn(options.actions.changeNameAsync);
      const store = Store.create(options);
      const payload = '__NEW_NAME_ASYNC';

      store.$dispatch('changeNameAsync', payload);

      expect(options.actions.changeNameAsync).toBeCalledTimes(1);

      const context = (options.actions.changeNameAsync as any).mock.calls[0][0];
      expect(context.state).toBe(store.$state);

      const data = (options.actions.changeNameAsync as any).mock.calls[0][1];
      expect(data).toBe(payload);
    });

    it('creates a warning when calling a action that does not exist', () => {
      const store = Store.create(createStoreOptions());
      store.$dispatch('DOES NOT EXST');
      expect(consoleReference.warn).toBeCalledTimes(1);
      expect(consoleReference.warn).toBeCalledWith(
        "[Reactivity Warning]: Action with key 'DOES NOT EXST' does not exist",
      );
    });

    it('throws an error when the action fails to evaluate', () => {
      const options: any = createStoreOptions();
      options.actions.errorAction = () => {
        throw new Error('test');
      };
      const store = new Store(options);
      expect(() => store.$dispatch('errorAction')).toThrowError('test');
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
      store.$commit('changeName', 'NEW STORE NAME');
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
      store.$commit('changeName', 'NEW STORE NAME');
      expect(watcher).toBeCalledWith('NEW STORE NAME', 'random wholesalers');

      watcher.mockClear();
      store.$unwatch('name', watcher);
      store.$commit('changeName', 'another new store name');
      expect(watcher).not.toBeCalled();
    });
  });

  test('store state can not be set outside of mutations', () => {
    const options: any = createStoreOptions();
    options.actions.invalid = function(ctx: any) {
      ctx.state.name = 'INVALID';
    };
    const store: any = Store.create(options);
    expect(() => (store.$state.name = '__NEW_NAME__')).toThrowError(REACTIVITY_DISABLED_EXCEPTION);
    expect(() => store.$dispatch('invalid')).toThrowError(REACTIVITY_DISABLED_EXCEPTION);
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
    mutations: {
      changeName(ctx: any, name: string) {
        ctx.state.name = name;
      },
      addStockItem(ctx: any, item: any) {
        ctx.state.stock.push(item);
      },
    },
    actions: {
      changeNameAsync(ctx: any, name: string): void {
        setTimeout(() => {
          ctx.commit('changeName', name);
        }, 10);
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
