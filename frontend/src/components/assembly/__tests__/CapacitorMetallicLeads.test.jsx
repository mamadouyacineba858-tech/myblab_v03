// MB-L1-PROP-005-R1 — correction visuelle après Canvas FAIL.
// React explicite requis par la config Vitest secondaire du dépôt.
// eslint-disable-next-line no-unused-vars
import React from "react"
import { describe, it, expect } from "vitest"
import { render } from "@testing-library/react"
import { resolveAssemblyGeometry } from "../../../utils/assemblyGeometry.js"
import { AssemblyLeadsLayer } from "../AssemblyLeadsLayer.jsx"

describe("MB-L1-PROP-005-R1 — CAPACITOR metallic leads", () => {
  it("préserve les racines/contacts et projette le style métallique déclaratif", () => {
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
    expect(container.querySelectorAll("line.assembly-leads__lead--wire")).toHaveLength(0)
  })
})
