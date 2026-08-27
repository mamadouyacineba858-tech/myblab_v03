import { describe, expect, it } from "vitest"
import { deriveBreadboardVirtualWires } from "../breadboardConnectivity.js"
import { makeBreadboardHoleEndpoint } from "../breadboardWireEndpoint.js"

const breadboard = {
  id: "bb-1",
  position: { x: 0, y: 0 },
  layout: "STANDARD_V1",
}

const resistor = {
  id: "r1",
  type: "RESISTOR",
  position: { x: 0, y: 22 }, // pin A -> (0,36) -> strip col 0, row 3
}

const led = {
  id: "led1",
  type: "LED",
  position: { x: 12, y: 16 }, // anode -> (12,36) -> strip col 1, row 3
}

describe("breadboard explicit wire connectivity", () => {
  it("connects two distinct strip groups through a hole-to-hole wire", () => {
    const a = makeBreadboardHoleEndpoint("bb-1", 0, 3)
    const b = makeBreadboardHoleEndpoint("bb-1", 1, 3)

    const virtualWires = deriveBreadboardVirtualWires({
      breadboard,
      components: [resistor, led],
      wires: [{
        id: "w-hole-hole",
        pinA: { componentId: a.uid, pinId: a.pinId },
        pinB: { componentId: b.uid, pinId: b.pinId },
      }],
    })

    expect(virtualWires).toContainEqual({
      pinA: { componentId: "r1", pinId: "A" },
      pinB: { componentId: "led1", pinId: "anode" },
    })
  })

  it("connects a component pin to another component through a hole endpoint", () => {
    const hole = makeBreadboardHoleEndpoint("bb-1", 1, 3)

    const virtualWires = deriveBreadboardVirtualWires({
      breadboard,
      components: [resistor, led],
      wires: [{
        id: "w-pin-hole",
        pinA: { componentId: "r1", pinId: "A" },
        pinB: { componentId: hole.uid, pinId: hole.pinId },
      }],
    })

    expect(virtualWires).toContainEqual({
      pinA: { componentId: "led1", pinId: "anode" },
      pinB: { componentId: "r1", pinId: "A" },
    })
  })
})
