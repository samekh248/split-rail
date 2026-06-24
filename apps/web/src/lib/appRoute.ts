export function isEventWorkspacePath(_pathname: string): boolean {
  return false;
}

export function navigateToDashboard(): void {
  const url = new URL(window.location.href);
  url.search = '';
  window.history.replaceState({}, '', url.pathname);
}
