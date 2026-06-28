import { useEffect, useState } from "react";
import App from "./App";
import { GettingStartedCard } from "./components/GettingStartedCard";
import { isPhoneViewportWidth } from "./lib/phoneViewport";

function currentViewportIsPhone(): boolean {
  return isPhoneViewportWidth(window.innerWidth);
}

function PhoneViewportMessage() {
  return (
    <div className="flex min-h-screen w-screen items-center justify-center overflow-x-hidden bg-app-chrome py-6">
      <main className="w-full max-w-[390px] overflow-hidden rounded-lg border border-stone-300 bg-white text-center font-mono shadow-lg">
        <section
          aria-label="Desktop required"
          className="w-full px-2 py-4"
        >
          <p className="text-sm font-semibold text-stone-900">
            Plotr only works on desktop
          </p>
          <p className="mt-2 text-xs leading-snug text-stone-600">
            Open it on a laptop or desktop to build charts.
          </p>
        </section>
        <GettingStartedCard
          dismissible={false}
          framed={false}
          className="border-t border-stone-200"
        />
      </main>
    </div>
  );
}

export function BuilderRoot() {
  const [isPhone, setIsPhone] = useState(() => currentViewportIsPhone());

  useEffect(() => {
    const updateViewport = () => setIsPhone(currentViewportIsPhone());
    updateViewport();
    window.addEventListener("resize", updateViewport);
    window.addEventListener("orientationchange", updateViewport);
    return () => {
      window.removeEventListener("resize", updateViewport);
      window.removeEventListener("orientationchange", updateViewport);
    };
  }, []);

  return isPhone ? <PhoneViewportMessage /> : <App />;
}
