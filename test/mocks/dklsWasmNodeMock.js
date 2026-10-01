/**
 * Jest mock for @silencelaboratories/dkls-wasm-ll-node. The node build crashes under Hermes,
 * so loading it means the @bitgo/sdk-lib-mpc patch no longer routes DKLS to the web shim.
 */
throw new Error(
  '@silencelaboratories/dkls-wasm-ll-node must not be loaded in React Native',
);
