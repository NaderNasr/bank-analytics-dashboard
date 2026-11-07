"use client";

import { Menu, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRef } from "react";

import { Brand } from "./brand";
import { SidebarNav } from "./sidebar-nav";

/**
 * Below the lg breakpoint the sidebar becomes a modal drawer. A native <dialog> gives focus
 * trapping, Escape to close and inert background for free.
 */
export function MobileNav() {
  const t = useTranslations("Shell");
  const dialog = useRef<HTMLDialogElement>(null);
  const close = () => dialog.current?.close();

  return (
    <>
      <button
        type="button"
        onClick={() => dialog.current?.showModal()}
        aria-label={t("openMenu")}
        aria-haspopup="dialog"
        className="inline-flex size-11 items-center justify-center rounded-md text-fg-muted hover:bg-surface-muted hover:text-fg sm:size-9 lg:hidden"
      >
        <Menu aria-hidden className="size-5" />
      </button>
      <dialog
        ref={dialog}
        aria-label={t("openMenu")}
        onClick={(event) => {
          if (event.target === dialog.current) close(); // click on the backdrop
        }}
        className="drawer m-0 h-dvh max-h-dvh w-72 max-w-[85vw] bg-nav p-0 text-on-nav shadow-overlay backdrop:bg-scrim"
      >
        <div className="flex h-full flex-col gap-6 p-4">
          <div className="flex items-center justify-between">
            <Brand />
            <button
              type="button"
              onClick={close}
              aria-label={t("closeMenu")}
              className="inline-flex size-11 items-center justify-center rounded-md text-nav-muted hover:bg-nav-hover hover:text-on-nav sm:size-9"
            >
              <X aria-hidden className="size-5" />
            </button>
          </div>
          <SidebarNav onNavigate={close} />
        </div>
      </dialog>
    </>
  );
}
