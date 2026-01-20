import { render } from "@testing-library/react";
import React, { useContext, type RefObject } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import ScreenShareContainerComponent, {
  ScreenSharePlayerContext,
} from "./ScreenShareContainerComponent";

describe("VideoPlayerContainerComponent", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should render video-player-container element", () => {
    const { container } = render(
      <ScreenShareContainerComponent>
        <div />
      </ScreenShareContainerComponent>,
    );

    expect(container.querySelector("video-player-container")).toBeInTheDocument();
  });

  it("should render children", () => {
    const { getByTestId } = render(
      <ScreenShareContainerComponent>
        <div data-testid="child-element">Test Child</div>
      </ScreenShareContainerComponent>,
    );

    expect(getByTestId("child-element")).toBeInTheDocument();
  });

  it("should provide React ref to VideoPlayerContext", () => {
    let context: RefObject<HTMLDivElement | null> | null = null;

    const ChildComponent = () => {
      context = useContext(ScreenSharePlayerContext);
      return <></>;
    };

    render(
      <ScreenShareContainerComponent>
        <ChildComponent />
      </ScreenShareContainerComponent>,
    );

    expect(context).not.toBeNull();
    expect((context as unknown as RefObject<HTMLDivElement | null>)?.current).toBeInstanceOf(
      HTMLElement,
    );
  });

  it("should provide React ref to video-player-container element", () => {
    let context: RefObject<HTMLDivElement | null> | null = null;

    const ChildComponent = () => {
      context = useContext(ScreenSharePlayerContext);
      return <></>;
    };

    const { container } = render(
      <ScreenShareContainerComponent>
        <ChildComponent />
      </ScreenShareContainerComponent>,
    );

    const videoPlayerContainer = container.querySelector("video-player-container");

    expect((context as unknown as RefObject<HTMLDivElement | null>)?.current).toEqual(
      videoPlayerContainer,
    );
  });

  it("should forward props to video-player-container element", () => {
    const { container } = render(
      <ScreenShareContainerComponent
        className="custom-test-class"
        style={{ height: "400px", width: "100%" }}
      >
        <div />
      </ScreenShareContainerComponent>,
    );

    const videoPlayerContainer = container.querySelector("video-player-container");

    expect(videoPlayerContainer).toHaveClass("custom-test-class");
    expect(videoPlayerContainer).toHaveStyle({ height: "400px", width: "100%" });
  });
});
