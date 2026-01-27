/**
 * Checks if WebGPU is supported and enabled in the current environment.
 */
export async function supportsWebGPU(): Promise<boolean> {
    if (typeof navigator === 'undefined' || !navigator.gpu) {
        return false;
    }

    try {
        const adapter = await navigator.gpu.requestAdapter();
        return !!adapter;
    } catch (e) {
        console.warn('WebGPU check failed:', e);
        return false;
    }
}
