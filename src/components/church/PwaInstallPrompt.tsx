import { useEffect, useRef, useState } from "react";
import { Share, PlusSquare, Check } from "lucide-react";
import { Modal, ModalFooter, Btn } from "@/components/church/ui";
import { ChurchBrand } from "@/components/church/ChurchBrand";
import {
  type BeforeInstallPromptEvent,
  dismissPwaInstallPrompt,
  isInStandaloneMode,
  isIosDevice,
  isPwaInstallDismissed,
} from "@/lib/pwa-install";

interface PwaInstallPromptProps {
  churchName: string;
  logoUrl?: string;
  tagline?: string;
}

export function PwaInstallPrompt({ churchName, logoUrl, tagline }: PwaInstallPromptProps) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"ios" | "native">("native");
  const [canInstall, setCanInstall] = useState(false);
  const [installing, setInstalling] = useState(false);
  const deferredRef = useRef<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    if (isInStandaloneMode() || isPwaInstallDismissed()) return;

    const showNative = () => {
      setMode("native");
      setOpen(true);
    };

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      deferredRef.current = e as BeforeInstallPromptEvent;
      setCanInstall(true);
      showNative();
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstall);

    if (isIosDevice()) {
      setMode("ios");
      setOpen(true);
    }

    return () => window.removeEventListener("beforeinstallprompt", onBeforeInstall);
  }, []);

  const close = () => {
    dismissPwaInstallPrompt();
    setOpen(false);
  };

  const handleInstall = async () => {
    const prompt = deferredRef.current;
    if (!prompt) return;
    setInstalling(true);
    try {
      await prompt.prompt();
      const { outcome } = await prompt.userChoice;
      if (outcome === "accepted") {
        dismissPwaInstallPrompt();
        setOpen(false);
      }
    } finally {
      setInstalling(false);
      deferredRef.current = null;
    }
  };

  if (!open) return null;

  return (
    <Modal
      open={open}
      onClose={close}
      title={mode === "ios" ? "Add to Home Screen" : "Install app"}
      size="sm"
    >
      <div className="space-y-4">
        <ChurchBrand
          name={churchName}
          logoUrl={logoUrl}
          tagline={tagline}
          size="md"
          className="justify-center text-center [&>div]:items-center"
        />

        {mode === "ios" ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Install {churchName} on your iPhone for quick access — it opens like a normal app from your home screen.
            </p>
            <ol className="space-y-3 text-sm text-foreground">
              <li className="flex gap-3 rounded-xl border border-border bg-muted/40 p-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary">
                  1
                </span>
                <span className="pt-0.5">
                  Tap the <strong>Share</strong> button{" "}
                  <Share className="mx-0.5 inline h-4 w-4 align-text-bottom text-primary" aria-hidden /> at the
                  bottom of Safari (or the top bar on iPad).
                </span>
              </li>
              <li className="flex gap-3 rounded-xl border border-border bg-muted/40 p-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary">
                  2
                </span>
                <span className="pt-0.5">
                  Scroll the menu and tap <strong>Add to Home Screen</strong>{" "}
                  <PlusSquare className="mx-0.5 inline h-4 w-4 align-text-bottom text-primary" aria-hidden />.
                </span>
              </li>
              <li className="flex gap-3 rounded-xl border border-border bg-muted/40 p-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary">
                  3
                </span>
                <span className="pt-0.5">
                  Tap <strong>Add</strong> in the top-right corner{" "}
                  <Check className="mx-0.5 inline h-4 w-4 align-text-bottom text-emerald-600" aria-hidden /> — the
                  church logo will appear on your home screen.
                </span>
              </li>
            </ol>
            <p className="text-xs text-muted-foreground">
              Use Safari if you do not see &quot;Add to Home Screen&quot; — other browsers on iPhone may not support
              installing web apps.
            </p>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Install {churchName} on this device for faster access, notifications-friendly home-screen launch, and an
            app-like experience.
          </p>
        )}
      </div>

      <ModalFooter>
        <Btn variant="secondary" onClick={close}>
          Not now
        </Btn>
        {mode === "native" ? (
          <Btn onClick={handleInstall} disabled={installing || !canInstall}>
            {installing ? "Installing…" : "Install"}
          </Btn>
        ) : (
          <Btn onClick={close}>Got it</Btn>
        )}
      </ModalFooter>
    </Modal>
  );
}
