/**
 * MeshCore BLE SDK for TypeScript
 * Complete type definitions, encoders, and decoders for companion app development
 */

// Export types
export * from './types/index';

// Export codec utilities
export * from './codecs/types';
export * from './codecs/frame';

// Export command builders
export { Commands } from './commands/builders';

// Version
export const SDK_VERSION = '1.0.0';
