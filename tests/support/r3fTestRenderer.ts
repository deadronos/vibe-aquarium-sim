export interface UnmountableRenderer {
  unmount?: () => unknown;
}

/**
 * `@react-three/test-renderer`'s `unmount` may return either `void` or a
 * promise depending on the mounted tree. Await it when it is thenable so act()
 * warnings and leaked subscriptions do not bleed into the next test.
 */
export async function unmountTestRenderer(renderer: UnmountableRenderer): Promise<void> {
  const result = renderer.unmount?.();
  if (result && typeof (result as Promise<unknown>).then === 'function') {
    await result;
  }
}
