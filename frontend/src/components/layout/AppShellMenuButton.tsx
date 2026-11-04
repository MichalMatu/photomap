import { Menu, X } from "lucide-react";

import type { AppShellNavigationState } from "./appShellNavigation";

type Props = {
  label: string;
  navigationState: AppShellNavigationState;
  onClick: () => void;
};

export function AppShellMenuButton({ label, navigationState, onClick }: Props) {
  const isMenuOpen = navigationState === "drawer";
  return (
    <button
      className={navigationState === "collapsed" ? "shell-menu-button" : "shell-menu-button is-active"}
      type="button"
      aria-controls={isMenuOpen ? "app-side-drawer" : "app-side-rail"}
      aria-expanded={navigationState !== "collapsed"}
      aria-label={label}
      title={label}
      onClick={onClick}
    >
      {isMenuOpen ? <X aria-hidden="true" size={24} /> : <Menu aria-hidden="true" size={24} />}
    </button>
  );
}
