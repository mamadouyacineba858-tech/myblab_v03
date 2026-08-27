import { describe, expect, it } from "vitest"
import {
  BREADBOARD_HOLE_PIN_ID,
  makeBreadboardHoleEndpoint,
  parseBreadboardHoleEndpoint,
} from "../breadboardWireEndpoint.js"

describe("breadboard wire endpoints", () => {
  it("round-trips a real hole identity", () => {
    const endpoint = makeBreadboardHoleEndpoint("bb-1", 24, 10)

    expect(endpoint).toEqual({
      uid: "__breadboard_hole__:bb-1:24:10",
      pinId: BREADBOARD_HOLE_PIN_ID,
    })
    expect(parseBreadboardHoleEndpoint(endpoint.uid, endpoint.pinId)).toEqual({
      breadboardId: "bb-1",
      column: 24,
      row: 10,
    })
  })

  it("rejects ordinary component-pin endpoints", () => {
    expect(parseBreadboardHoleEndpoint("res-1", "A")).toBeNull()
  })
})
