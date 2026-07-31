import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ShootingStars } from "./ShootingStars";

describe("ShootingStars", () => {
  it("renders a fixed decorative vector schedule without interaction", () => {
    const { container } = render(<ShootingStars />);
    const field = screen.getByTestId("shooting-stars");

    expect(field).toHaveAttribute("aria-hidden", "true");
    expect(field.querySelectorAll("line")).toHaveLength(5);
    expect(field.querySelector("line")).toHaveStyle({
      "--shooting-delay": "2s",
      "--shooting-duration": "23s",
    });
    expect(container.querySelector("button, a")).not.toBeInTheDocument();
  });
});
