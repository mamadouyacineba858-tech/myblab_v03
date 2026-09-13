// MB-L1-PROP-005-R3 — correction visuelle après Canvas FAIL des pattes.
// React explicite requis par la config Vitest secondaire du dépôt.
// eslint-disable-next-line no-unused-vars
import React from "react"
import { describe, it, expect } from "vitest"
import { render } from "@testing-library/react"
import { resolveAssemblyGeometry } from "../../../utils/assemblyGeometry.js"
import { AssemblyLeadsLayer } from "../AssemblyLeadsLayer.jsx"

describe("MB-L1-PROP-005-R3 — CAPACITOR visible polished metallic leads", () => {
  it("préserve racines/contacts et rend trois couches visibles par patte", () => {
    const geometry = resolveAssemblyGeometry(
      { uid: "c-v2", type: "CAPACITOR", x: 100, y: 200 },
      null,
    )

    expect(geometry.contacts).toHaveLength(2)
    expect(geometry.contacts.map((c) => [c.pinId, c.root.x - 100, c.root.y - 200, c.target.x - 100, c.target.y - 200, c.style])).toEqual([
      ["pinA", 23, 27, 23, 62, "metallic-wire"],
      ["pinB", 47, 27, 47, 62, "metallic-wire"],
    ])

    const { container } = render(
      <AssemblyLeadsLayer geometry={geometry} originX={100} originY={200} />,
    )

    expect(container.querySelectorAll("line.assembly-leads__lead--metallic-wire")).toHaveLength(2)
    expect(container.querySelectorAll("line.assembly-leads__metallic-core")).toHaveLength(2)
    expect(container.querySelectorAll("line.assembly-leads__metallic-highlight")).toHaveLength(2)
    expect(container.querySelectorAll("line.assembly-leads__lead--wire")).toHaveLength(0)
    expect(container.querySelector("#assembly-lead-metallic-v")).toBeNull()
    expect(container.querySelector("#assembly-lead-metallic-h")).toBeNull()

    const functionalLeads = container.querySelectorAll("line.assembly-leads__lead")
    expect(functionalLeads).toHaveLength(2)
    for (const lead of functionalLeads) {
      expect(lead.getAttribute("x1")).toBe(lead.getAttribute("x2"))
    }
  })
})
