import React from "react"
import { describe, it, expect, vi } from "vitest"
import { fireEvent, render, screen } from "@testing-library/react"

const mockState = vi.hoisted(() => ({
  selectedComponent: { uid: "arduino-1", type: "ARDUINO", firmware: { source: "void setup() {}" } },
  updateArduinoFirmware: vi.fn(),
  firmwareDiagnostics: {},
}))
vi.mock("../../context/useCircuit.js", () => ({
  useCircuit: () => mockState,
}))
vi.mock("../firmware/firmwareCompiler.js", () => ({
  compileFirmware: vi.fn(() => ({ ok: true, diagnostics: [] })),
}))
import { ArduinoCodeWorkspace } from "./ArduinoCodeWorkspace.jsx"

describe("MYBLAB-ARDUINO-003: three-zone editor ergonomics", () => {
  it("keeps a draft when code panel is minimized and reopened", () => {
    render(<ArduinoCodeWorkspace onClose={vi.fn()} />)
    const editor = screen.getByLabelText("Programme Arduino")
    fireEvent.change(editor, { target: { value: "void setup() { pinMode(2, OUTPUT); }" } })
    expect(screen.getByText("Modifications non appliquées au circuit.")).toBeTruthy()
    fireEvent.click(screen.getByRole("button", { name: "Réduire" }))
    expect(screen.queryByLabelText("Programme Arduino")).toBeNull()
    fireEvent.click(screen.getByRole("button", { name: "Agrandir" }))
    expect(screen.getByLabelText("Programme Arduino").value).toContain("pinMode(2, OUTPUT)")
  })
  it("reveals example choices on demand", () => {
    render(<ArduinoCodeWorkspace onClose={vi.fn()} />)
    expect(screen.queryByText("Exemple : LED clignotante D2")).toBeNull()
    fireEvent.click(screen.getByRole("button", { name: "Choisir un exemple" }))
    fireEvent.click(screen.getByRole("button", { name: "Exemple : LED clignotante D2" }))
    expect(screen.getByLabelText("Programme Arduino").value).toContain("digitalWrite(2, HIGH)")
  })
})
