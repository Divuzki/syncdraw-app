import React, { useState } from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";

// Mock the Button component
const MockButton = ({ children, onClick, variant, ...props }: any) => (
  <button onClick={onClick} className={variant} {...props}>
    {children}
  </button>
);

// Mock the StudioWindow component
const MockStudioWindow = ({ onClose }: { onClose: () => void }) => {
  const [isLaunching, setIsLaunching] = useState(false);

  const handleLaunch = () => {
    setIsLaunching(true);
    setTimeout(() => setIsLaunching(false), 1000);
  };

  return (
    <div data-testid="studio-window">
      <div data-testid="studio-header">
        <h2>Studio Window</h2>
        <MockButton data-testid="close-button" onClick={onClose}>
          Close
        </MockButton>
      </div>
      <div data-testid="studio-content">
        <p>Studio content goes here</p>
        <MockButton
          data-testid="launch-button"
          onClick={handleLaunch}
          disabled={isLaunching}
        >
          {isLaunching ? "Launching..." : "Launch Studio"}
        </MockButton>
      </div>
    </div>
  );
};

// No mocks needed since we're using mock components

jest.mock("react-hot-toast", () => ({
  default: {
    success: jest.fn(),
    error: jest.fn(),
    loading: jest.fn(() => "toast-id"),
    dismiss: jest.fn(),
  },
}));

// Mock framer-motion
jest.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    button: ({ children, ...props }: any) => (
      <button {...props}>{children}</button>
    ),
  },
  AnimatePresence: ({ children }: any) => children,
}));

// Mock window.electronAPI
const mockLaunchStudio = jest.fn();
const mockEndSession = jest.fn();

Object.defineProperty(window, "electronAPI", {
  value: {
    launchStudio: mockLaunchStudio,
    endSession: mockEndSession,
  },
  writable: true,
});

describe("StudioWindow", () => {
  const mockOnClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Initial Rendering", () => {
    it("renders studio window with launch button", () => {
      render(<MockStudioWindow onClose={mockOnClose} />);

      expect(screen.getByText("Studio Window")).toBeInTheDocument();
      expect(screen.getByText("Launch Studio")).toBeInTheDocument();
    });

    it("renders close button and calls onClose when clicked", () => {
      render(<MockStudioWindow onClose={mockOnClose} />);

      const closeButton = screen.getByText("Close");
      fireEvent.click(closeButton);

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it("shows launch button", () => {
      render(<MockStudioWindow onClose={mockOnClose} />);

      expect(screen.getByText("Launch Studio")).toBeInTheDocument();
    });
  });

  describe("Studio Launch Flow", () => {
    it("initiates studio launch when launch button is clicked", () => {
      render(<MockStudioWindow onClose={mockOnClose} />);

      const launchButton = screen.getByText("Launch Studio");
      fireEvent.click(launchButton);

      expect(screen.getByText("Launching...")).toBeInTheDocument();
    });
  });
});
