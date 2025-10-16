import "@testing-library/jest-dom";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// define env
process.env.VITE_ZOOM_SDK_KEY = import.meta.env.VITE_ZOOM_SDK_KEY;
process.env.VITE_ZOOM_SDK_SECRET = import.meta.env.VITE_ZOOM_SDK_SECRET;

afterEach(() => {
  cleanup();
});
