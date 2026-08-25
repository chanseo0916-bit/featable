let panelOpen = false;
const listeners = new Set<() => void>();

export function setBoardSplitPanelOpen(open: boolean) {
  if (panelOpen === open) return;
  panelOpen = open;
  listeners.forEach((listener) => listener());
}

export function subscribeToBoardSplitPanel(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getBoardSplitPanelSnapshot() {
  return panelOpen;
}

export function getBoardSplitPanelServerSnapshot() {
  return false;
}
