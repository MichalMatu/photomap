import { Menu, X } from "lucide-react";
import type { AppShellNavigationState } from "./appShellNavigation";

type Props = {
  navigationState: AppShellNavigationState;
  onClick: () => void;
};

export function AppShellMenuButton({ navigationState, onClick }: Props) {
  const isMenuOpen = navigationState === "drawer";
  const label = isMenuOpen ? "Zamknij menu" : "Otwórz menu";
  return (
    <button
      className={isMenuOpen ? "shell-menu-button is-active" : "shell-menu-button"}
      type="button"
      aria-controls="app-side-drawer"
      aria-expanded={isMenuOpen}
      aria-label={label}
      title={label}
      onClick={onClick}
    >
      {isMenuOpen ? <X aria-hidden="true" size={24} /> : <Menu aria-hidden="true" size={24} />}
    </button>
  );
}
