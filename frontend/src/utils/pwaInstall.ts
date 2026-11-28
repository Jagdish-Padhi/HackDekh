import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

let deferredPrompt: BeforeInstallPromptEvent | null = null;
let installedInSession = false;
const listeners = new Set<() => void>();

const checkStandalone = (): boolean => {
  if (typeof window === "undefined") return false;
  if (installedInSession) return true;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: fullscreen)").matches ||
    window.matchMedia("(display-mode: minimal-ui)").matches ||
    (window.navigator as { standalone?: boolean }).standalone === true ||
    document.referrer.startsWith("android-app://")
  );
};

const notify = () => {
  listeners.forEach((cb) => cb());
};

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPrompt = e as BeforeInstallPromptEvent;
    notify();
  });

  window.addEventListener("appinstalled", () => {
    deferredPrompt = null;
    installedInSession = true;
    notify();
  });
}

export function usePwaInstall() {
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(deferredPrompt);
  const [isStandalone, setIsStandalone] = useState<boolean>(checkStandalone);

  useEffect(() => {
    const sync = () => {
      setPromptEvent(deferredPrompt);
      setIsStandalone(checkStandalone());
    };
    listeners.add(sync);
    sync();

    const mq = window.matchMedia("(display-mode: standalone)");
    mq.addEventListener?.("change", sync);

    return () => {
      listeners.delete(sync);
      mq.removeEventListener?.("change", sync);
    };
  }, []);

  const promptInstall = async (): Promise<"accepted" | "dismissed" | "unavailable"> => {
    if (!deferredPrompt) return "unavailable";
    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    if (choice?.outcome === "accepted") {
      deferredPrompt = null;
      notify();
      return "accepted";
    }
    return "dismissed";
  };

  return {
    canPromptInstall: !!promptEvent,
    isStandalone,
    promptInstall,
  };
}
