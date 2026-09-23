import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Pipeline, Stage } from "@/lib/kanban/types";
import { KanbanBoard } from "./KanbanBoard";

vi.mock("@hello-pangea/dnd", () => ({
  DragDropContext: ({ children }: { children: React.ReactNode }) => children,
}));
vi.mock("@/hooks/i18n/useT", () => ({ useT: () => (text: string) => text }));
vi.mock("@/hooks/kanban/useBoard", () => ({
  useBoard: () => ({ data: null, isLoading: false, isError: false, pulses: new Map() }),
}));
vi.mock("@/hooks/kanban/useMoveCard", () => ({
  useMoveCard: () => ({ mutate: vi.fn() }),
}));
vi.mock("@/hooks/inbox/useAssignableMembers", () => ({
  useAssignableMembers: () => ({ data: [] }),
}));
vi.mock("@/hooks/leads/useAtRiskLeads", () => ({
  useAtRiskLeads: () => ({ data: { items: [] } }),
}));
vi.mock("@/hooks/leads/useReactivations", () => ({
  useReactivations: () => ({ data: [] }),
}));
vi.mock("./StageColumn", () => ({
  StageColumn: ({ stage }: { stage: Stage }) => <div>{stage.name}</div>,
}));

let measure: (() => void) | undefined;
class ResizeObserverStub {
  constructor(callback: ResizeObserverCallback) {
    measure = () => callback([], this);
  }
  observe() {}
  disconnect() {}
  unobserve() {}
}

const stages = [
  { id: "entrada", name: "Entrada" },
  { id: "conversa", name: "Conversa" },
  { id: "visita", name: "Visita" },
] as Stage[];

describe("navegação horizontal do funil", () => {
  beforeEach(() => {
    measure = undefined;
    vi.stubGlobal("ResizeObserver", ResizeObserverStub);
  });

  it("a barra leva ao fim e acompanha a rolagem do quadro", () => {
    render(
      <KanbanBoard
        pipelineId="funil"
        stages={stages}
        leads={[]}
        pipeline={{ settings: {} } as Pipeline}
      />,
    );
    const board = screen.getByTestId("kanban-board-scroll");
    Object.defineProperty(board, "scrollWidth", { configurable: true, value: 1200 });
    Object.defineProperty(board, "clientWidth", { configurable: true, value: 400 });
    act(() => measure?.());

    const slider = screen.getByRole("slider", { name: "Percorrer etapas do funil" });
    expect(slider).toHaveAttribute("max", "800");
    fireEvent.change(slider, { target: { value: "800" } });
    expect(board.scrollLeft).toBe(800);

    board.scrollLeft = 250;
    fireEvent.scroll(board);
    expect(slider).toHaveValue("250");
  });
});
