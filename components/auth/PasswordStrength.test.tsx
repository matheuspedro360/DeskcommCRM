import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { PasswordStrength } from "./PasswordStrength";

vi.mock("@/hooks/i18n/useT", () => ({ useT: () => (value: string) => value }));

describe("força da senha", () => {
  it.each([
    ["abc", "Fraca"],
    ["Senha123", "Média"],
    ["Senha123!", "Forte"],
  ])("classifica %s sem alterar a lista de requisitos", (password, esperado) => {
    render(<PasswordStrength password={password} />);
    expect(screen.getByTestId("password-strength-label")).toHaveTextContent(esperado);
    expect(screen.getAllByRole("listitem")).toHaveLength(5);
  });
});
