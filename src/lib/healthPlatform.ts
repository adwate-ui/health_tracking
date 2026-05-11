/**
 * healthPlatform.ts
 *
 * Thin abstraction over native health APIs.
 * On web: always returns null (user enters steps manually).
 * On iOS:  reads from HealthKit via @capacitor/health-kit.
 * On Android: reads from Health Connect via @capacitor-community/health-connect.
 *
 * Import guard pattern: dynamic imports are used so the web bundle is not
 * affected. Vite tree-shakes the native plugin code from the web build.
 */

// Capacitor core is installed as a dependency so this import is safe.
// On web, Capacitor.isNativePlatform() returns false and getPlatform() returns 'web'.
let _isNative: boolean | undefined;
let _platform: string | undefined;

function getCapacitorInfo(): { isNative: boolean; platform: string } {
  if (_isNative !== undefined) return { isNative: _isNative, platform: _platform! };

  try {
    // Dynamic require — Capacitor core is a CJS package.
    // This path is only hit on first call; result is cached.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cap = (globalThis as any).__capacitorObject ?? null;
    if (cap) {
      _isNative = cap.isNativePlatform();
      _platform = cap.getPlatform();
    } else {
      // In the browser Capacitor attaches itself to window; in tests it may not.
      _isNative = false;
      _platform = 'web';
    }
  } catch {
    _isNative = false;
    _platform = 'web';
  }

  return { isNative: _isNative!, platform: _platform! };
}

export function isNativePlatform(): boolean {
  return getCapacitorInfo().isNative;
}

export function getPlatform(): 'ios' | 'android' | 'web' {
  return getCapacitorInfo().platform as 'ios' | 'android' | 'web';
}

/**
 * Returns the step count for a given date from the native health platform,
 * or null if running on web or if the permission is denied.
 */
export async function getNativeStepCount(date: Date): Promise<number | null> {
  const { isNative, platform } = getCapacitorInfo();
  if (!isNative) return null;

  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  try {
    if (platform === 'android') {
      // @capacitor-community/health-connect
      // Install: npm install @capacitor-community/health-connect
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-expect-error — optional native plugin, not installed on web
      const { HealthConnect } = await import('@capacitor-community/health-connect');
      const result = await HealthConnect.readRecords({
        type: 'Steps',
        timeRangeFilter: {
          operator: 'between',
          startTime: startOfDay.toISOString(),
          endTime: endOfDay.toISOString(),
        },
      });
      const total = result.records.reduce(
        (sum: number, r: { count: number }) => sum + r.count,
        0,
      );
      return total;
    }

    if (platform === 'ios') {
      // @capacitor/health-kit (requires Apple Developer account + HealthKit entitlement)
      // Install: npm install @capacitor/health-kit
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-expect-error — optional native plugin, not installed on web
      const { HealthKit } = await import('@capacitor/health-kit');
      const result = await HealthKit.queryQuantityData({
        sampleType: 'HKQuantityTypeIdentifierStepCount',
        startDate: startOfDay.toISOString(),
        endDate: endOfDay.toISOString(),
        unit: 'count',
        aggregation: 'sum',
      });
      return Math.round(result.value ?? 0);
    }
  } catch (err) {
    // Permission denied or plugin not installed — fall back silently
    console.warn('[healthPlatform] Step count unavailable:', err);
  }

  return null;
}
