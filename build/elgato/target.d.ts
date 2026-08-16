import type { ElgatoTarget } from './types';
export declare function normalizeTarget(hostInput: string, portInput?: number): ElgatoTarget;
export declare function targetBaseUrl(target: ElgatoTarget): string;
