// CommonJS consumer fixture: resolves the *built* package through its `exports` map.
const pkg = require('@react-object-page/core');

const ref = { current: null };
const node = { id: 'node' };
const composed = pkg.composeRefs(ref);
composed(node);
if (ref.current !== node) throw new Error('composeRefs did not assign the node');
composed(null);
if (ref.current !== null) throw new Error('composeRefs did not clear the ref');

console.log(JSON.stringify(Object.keys(pkg)));
