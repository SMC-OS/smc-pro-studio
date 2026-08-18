import { Capacitor } from '@capacitor/core';

export interface NativeDeviceInfo {
  isNative: boolean;
  platform: 'web' | 'ios' | 'android';
  hasBiometricsAvailable: boolean;
  pushEnabled: boolean;
  cameraPermissionStatus: 'granted' | 'denied' | 'prompt';
}

/**
 * SMC Pro Studio Native Capacitor Bridge
 * Provides cross-platform native hooks for Capacitor iOS & Android builds
 * with graceful web fallbacks.
 */
export const CapacitorBridge = {
  isNative(): boolean {
    return Capacitor.isNativePlatform();
  },

  getPlatform(): 'web' | 'ios' | 'android' {
    const p = Capacitor.getPlatform();
    if (p === 'ios') return 'ios';
    if (p === 'android') return 'android';
    return 'web';
  },

  /**
   * Biometric Authentication (FaceID / TouchID / Passkey)
   */
  async authenticateBiometrics(reason: string = "Authenticate to access SMC Pro Studio Manager Portal"): Promise<{ success: boolean; error?: string }> {
    void reason;
    return {
      success: false,
      error: "Biometric authentication is unavailable until a verified native identity plugin is configured.",
    };
  },

  /**
   * Request Push Notifications with Store-compliant prompt rationale
   */
  async requestPushPermissions(): Promise<boolean> {
    if (!this.isNative()) {
      if ('Notification' in window) {
        const res = await Notification.requestPermission();
        return res === 'granted';
      }
      return false;
    }
    return false;
  },

  /**
   * Camera permission query with plain-English iOS/Android rationale
   */
  getCameraPermissionRationale(): { title: string; body: string } {
    return {
      title: "Camera Access for On-Site Measurement & Slab Scanning",
      body: "SMC Pro Studio requires camera access only when you explicitly open the AR Measurement tool or Slab Scanner. Photos are used locally to calculate dimensions and match marble grain patterns, and are never shared or sold."
    };
  }
};
