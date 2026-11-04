import type { AppShellAdminAction as AppShellAdminActionType } from "./appShellTypes";

type Props = {
  action: AppShellAdminActionType;
  onClick: () => void;
};

export function RailAdminAction({ action, onClick }: Props) {
  return (
    <button className="rail-admin-button" type="button" onClick={onClick} aria-label={action.label}>
      {action.shortLabel}
    </button>
  );
}

export function DrawerAdminAction({ action, onClick }: Props) {
  return (
    <nav className="drawer-section drawer-section--admin" aria-label="Administracja">
      <button className="drawer-item drawer-action" type="button" onClick={onClick}>
        <span className="drawer-admin-mark" aria-hidden="true">
          {action.shortLabel}
        </span>
        <span>{action.label}</span>
      </button>
    </nav>
  );
}
