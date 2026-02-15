'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { sdk, type Context } from '@farcaster/miniapp-sdk';

interface FrameSDKContextType {
  context: Context.MiniAppContext | null;
  isLoaded: boolean;
  isInMiniApp: boolean;
  error: string | null;
  actions: {
    viewProfile: (fid: number) => void;
    openUrl: (url: string) => void;
    close: () => void;
    ready: () => void;
    addMiniApp: () => void;
    setPrimaryButton: (text: string, callback: () => void) => void;
    clearPrimaryButton: () => void;
  };
}

const FrameSDKContext = createContext<FrameSDKContextType>({
  context: null,
  isLoaded: false,
  isInMiniApp: false,
  error: null,
  actions: {
    viewProfile: () => {},
    openUrl: () => {},
    close: () => {},
    ready: () => {},
    addMiniApp: () => {},
    setPrimaryButton: () => {},
    clearPrimaryButton: () => {},
  },
});

export function useFrameSDK() {
  return useContext(FrameSDKContext);
}

function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (['javascript:', 'data:', 'vbscript:', 'file:'].includes(parsed.protocol)) return false;
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

export function FrameSDKProvider({ children }: { children: ReactNode }) {
  const [context, setContext] = useState<Context.MiniAppContext | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInMiniApp, setIsInMiniApp] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        // Race: detect mini app context with 1.5s timeout
        const detected = await Promise.race([
          (async () => {
            const inMiniApp = await sdk.isInMiniApp();
            return inMiniApp;
          })(),
          new Promise<false>((resolve) => setTimeout(() => resolve(false), 1500)),
        ]);

        if (cancelled) return;

        if (detected) {
          setIsInMiniApp(true);
          const ctx = await sdk.context;
          if (!cancelled) {
            setContext(ctx);
            sdk.actions.ready();
            // Prompt user to add mini app (captures notification token)
            try {
              await sdk.actions.addMiniApp();
            } catch {
              // User may have already added it
            }
          }
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to initialize Farcaster SDK');
        }
      } finally {
        if (!cancelled) {
          setIsLoaded(true);
        }
      }
    }

    init();
    return () => { cancelled = true; };
  }, []);

  const viewProfile = useCallback((fid: number) => {
    if (!isInMiniApp || !Number.isInteger(fid) || fid <= 0) return;
    sdk.actions.openUrl(`https://warpcast.com/~/profiles/${fid}`);
  }, [isInMiniApp]);

  const openUrl = useCallback((url: string) => {
    if (!isInMiniApp || !isValidUrl(url)) return;
    sdk.actions.openUrl(url);
  }, [isInMiniApp]);

  const close = useCallback(() => {
    if (!isInMiniApp) return;
    sdk.actions.close();
  }, [isInMiniApp]);

  const ready = useCallback(() => {
    sdk.actions.ready();
  }, []);

  const addMiniApp = useCallback(() => {
    if (!isInMiniApp) return;
    sdk.actions.addMiniApp().catch(() => {});
  }, [isInMiniApp]);

  const setPrimaryButton = useCallback((text: string, callback: () => void) => {
    if (!isInMiniApp) return;
    sdk.actions.setPrimaryButton({ text, disabled: false, hidden: false });
    sdk.on('primaryButtonClicked', callback);
  }, [isInMiniApp]);

  const clearPrimaryButton = useCallback(() => {
    if (!isInMiniApp) return;
    sdk.actions.setPrimaryButton({ text: '', hidden: true, disabled: true });
  }, [isInMiniApp]);

  return (
    <FrameSDKContext.Provider
      value={{
        context,
        isLoaded,
        isInMiniApp,
        error,
        actions: { viewProfile, openUrl, close, ready, addMiniApp, setPrimaryButton, clearPrimaryButton },
      }}
    >
      {children}
    </FrameSDKContext.Provider>
  );
}
