/**
 * Adds `props` to `target` as non-enumerable properties: readable explicitly (`target.state`) but
 * skipped by object spread and `Object.keys`, so `<input {...target} />` never forwards them to
 * the DOM (no unknown-prop warning, no stray attribute). Spec §1.6, "no leak".
 */
export function defineHidden<T extends object, H extends object>(target: T, props: H): T & H {
  for (const key of Object.keys(props) as (keyof H & string)[]) {
    Object.defineProperty(target, key, { value: props[key], enumerable: false, writable: false, configurable: true });
  }
  return target as T & H;
}
