import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import App from "./App";

afterEach(cleanup);

describe("personal universe", () => {
  it("renders the quiet-zone introduction and five project constellations", () => {
    render(<App />);

    expect(
      screen.getByRole("heading", {
        name: /software should show its work/i,
      }),
    ).toBeVisible();
    expect(
      screen.getAllByRole("button", { name: /^explore /i }),
    ).toHaveLength(5);
  });

  it("renders projects in chronological DOM order", () => {
    render(<App />);

    expect(
      screen.getAllByTestId("project-year").map((node) => node.textContent),
    ).toEqual(["2020", "2021", "2022", "2026", "Now"]);
  });
});
