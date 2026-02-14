class FakeScene {
  type = 'Scene';
  children: unknown[] = [];
}

class FakeRoot {
  private _scene = new FakeScene();

  render(_element: unknown) {
    void _element;
    return Promise.resolve({
      scene: this._scene,
      unmount: () => {},
    });
  }

  unmount() {}
}

export const act = (fn: () => unknown) => fn();
export const createRoot = () => new FakeRoot();
export const create = (element: unknown) => createRoot().render(element);

export default {
  act,
  create,
  createRoot,
};
