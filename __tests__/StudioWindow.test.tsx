import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import toast from "react-hot-toast";

// Mock the Button component
const MockButton = ({ children, onClick, variant, ...props }: any) => (
  <button onClick={onClick} className={variant} {...props}>
    {children}
  </button>
);

// Mock the StudioWindow component
const MockStudioWindow = ({ onClose }: { onClose: () => void }) => {
  const [isLaunching, setIsLaunching] = React.useState(false);

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

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockUseSession = useSession as jest.MockedFunction<typeof useSession>;
const mockToast = toast as jest.Mocked<typeof toast>;

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
      render(<StudioWindow onClose={mockOnClose} />);

      expect(screen.getByText("Studio")).toBeInTheDocument();
      expect(screen.getByText("Launch Studio")).toBeInTheDocument();
      expect(
        screen.getByText("Start your collaborative music session")
      ).toBeInTheDocument();
    });

    it("renders close button and calls onClose when clicked", async () => {
      const user = userEvent.setup();

      render(<StudioWindow onClose={mockOnClose} />);

      const closeButton = screen.getByRole("button", { name: /close/i });
      await user.click(closeButton);

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it("shows session name when available", () => {
      render(<StudioWindow onClose={mockOnClose} />);

      expect(screen.getByText("Test Session")).toBeInTheDocument();
    });
  });

  describe("Studio Launch Flow", () => {
    it("initiates studio launch when launch button is clicked", async () => {
      const user = userEvent.setup();
      mockLaunchStudio.mockResolvedValue({
        success: true,
        streamUrl: "http://localhost:8080",
      });

      render(<StudioWindow onClose={mockOnClose} />);

      const launchButton = screen.getByText("Launch Studio");
      await user.click(launchButton);

      expect(mockLaunchStudio).toHaveBeenCalledWith("test-session-id");
      expect(mockToast.loading).toHaveBeenCalledWith("Launching studio...");
    });

    it("displays progress steps during launch", async () => {
      const user = userEvent.setup();

      // Mock a delayed response to see progress
      mockLaunchStudio.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({ success: true, streamUrl: "http://localhost:8080" }),
              100
            )
          )
      );

      render(<StudioWindow onClose={mockOnClose} />);

      const launchButton = screen.getByText("Launch Studio");
      await user.click(launchButton);

      // Should show launching state
      expect(screen.getByText("Launching Studio...")).toBeInTheDocument();
      expect(screen.getByText("Setting up your session")).toBeInTheDocument();

      // Wait for completion
      await waitFor(
        () => {
          expect(screen.getByText("Studio Ready")).toBeInTheDocument();
        },
        { timeout: 2000 }
      );
    });

    it("shows progress bar during launch", async () => {
      const user = userEvent.setup();
      mockLaunchStudio.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({ success: true, streamUrl: "http://localhost:8080" }),
              100
            )
          )
      );

      render(<StudioWindow onClose={mockOnClose} />);

      const launchButton = screen.getByText("Launch Studio");
      await user.click(launchButton);

      // Should show progress bar
      const progressBar = screen.getByRole("progressbar");
      expect(progressBar).toBeInTheDocument();
    });

    it("transitions from modal to iframe when studio is ready", async () => {
      const user = userEvent.setup();
      mockLaunchStudio.mockResolvedValue({
        success: true,
        streamUrl: "http://localhost:8080",
      });

      render(<StudioWindow onClose={mockOnClose} />);

      const launchButton = screen.getByText("Launch Studio");
      await user.click(launchButton);

      await waitFor(() => {
        expect(screen.getByText("Studio Ready")).toBeInTheDocument();
      });

      // Should show iframe with stream URL
      await waitFor(() => {
        const iframe = screen.getByTitle("Studio Stream");
        expect(iframe).toBeInTheDocument();
        expect(iframe).toHaveAttribute("src", "http://localhost:8080");
      });
    });

    it("shows end session button when studio is active", async () => {
      const user = userEvent.setup();
      mockLaunchStudio.mockResolvedValue({
        success: true,
        streamUrl: "http://localhost:8080",
      });

      render(<StudioWindow onClose={mockOnClose} />);

      const launchButton = screen.getByText("Launch Studio");
      await user.click(launchButton);

      await waitFor(() => {
        expect(screen.getByText("End Session")).toBeInTheDocument();
      });
    });
  });

  describe("Error Handling", () => {
    it("displays error message when studio launch fails", async () => {
      const user = userEvent.setup();
      mockLaunchStudio.mockRejectedValue(new Error("Failed to launch studio"));

      render(<StudioWindow onClose={mockOnClose} />);

      const launchButton = screen.getByText("Launch Studio");
      await user.click(launchButton);

      await waitFor(() => {
        expect(screen.getByText("Failed to Launch Studio")).toBeInTheDocument();
        expect(screen.getByText("Failed to launch studio")).toBeInTheDocument();
      });

      expect(mockToast.error).toHaveBeenCalledWith("Failed to launch studio");
    });

    it("shows retry button after launch failure", async () => {
      const user = userEvent.setup();
      mockLaunchStudio.mockRejectedValue(new Error("Network error"));

      render(<StudioWindow onClose={mockOnClose} />);

      const launchButton = screen.getByText("Launch Studio");
      await user.click(launchButton);

      await waitFor(() => {
        expect(screen.getByText("Try Again")).toBeInTheDocument();
      });
    });

    it("allows retry after failure", async () => {
      const user = userEvent.setup();
      mockLaunchStudio
        .mockRejectedValueOnce(new Error("Network error"))
        .mockResolvedValueOnce({
          success: true,
          streamUrl: "http://localhost:8080",
        });

      render(<StudioWindow onClose={mockOnClose} />);

      // First attempt fails
      const launchButton = screen.getByText("Launch Studio");
      await user.click(launchButton);

      await waitFor(() => {
        expect(screen.getByText("Try Again")).toBeInTheDocument();
      });

      // Retry succeeds
      const retryButton = screen.getByText("Try Again");
      await user.click(retryButton);

      await waitFor(() => {
        expect(screen.getByText("Studio Ready")).toBeInTheDocument();
      });

      expect(mockLaunchStudio).toHaveBeenCalledTimes(2);
    });
  });

  describe("Session Management", () => {
    it("ends session when end session button is clicked", async () => {
      const user = userEvent.setup();
      mockLaunchStudio.mockResolvedValue({
        success: true,
        streamUrl: "http://localhost:8080",
      });
      mockEndSession.mockResolvedValue({ success: true });

      render(<StudioWindow onClose={mockOnClose} />);

      // Launch studio first
      const launchButton = screen.getByText("Launch Studio");
      await user.click(launchButton);

      await waitFor(() => {
        expect(screen.getByText("End Session")).toBeInTheDocument();
      });

      // End session
      const endButton = screen.getByText("End Session");
      await user.click(endButton);

      expect(mockEndSession).toHaveBeenCalledWith("test-session-id");
    });

    it("shows confirmation dialog before ending session", async () => {
      const user = userEvent.setup();
      mockLaunchStudio.mockResolvedValue({
        success: true,
        streamUrl: "http://localhost:8080",
      });

      // Mock window.confirm
      const mockConfirm = jest.fn(() => true);
      Object.defineProperty(window, "confirm", { value: mockConfirm });

      render(<StudioWindow onClose={mockOnClose} />);

      // Launch studio first
      const launchButton = screen.getByText("Launch Studio");
      await user.click(launchButton);

      await waitFor(() => {
        expect(screen.getByText("End Session")).toBeInTheDocument();
      });

      // End session
      const endButton = screen.getByText("End Session");
      await user.click(endButton);

      expect(mockConfirm).toHaveBeenCalledWith(
        "Are you sure you want to end this session? This action cannot be undone."
      );
    });

    it("does not end session if user cancels confirmation", async () => {
      const user = userEvent.setup();
      mockLaunchStudio.mockResolvedValue({
        success: true,
        streamUrl: "http://localhost:8080",
      });

      // Mock window.confirm to return false
      const mockConfirm = jest.fn(() => false);
      Object.defineProperty(window, "confirm", { value: mockConfirm });

      render(<StudioWindow onClose={mockOnClose} />);

      // Launch studio first
      const launchButton = screen.getByText("Launch Studio");
      await user.click(launchButton);

      await waitFor(() => {
        expect(screen.getByText("End Session")).toBeInTheDocument();
      });

      // Try to end session but cancel
      const endButton = screen.getByText("End Session");
      await user.click(endButton);

      expect(mockConfirm).toHaveBeenCalled();
      expect(mockEndSession).not.toHaveBeenCalled();
    });
  });

  describe("Role-based Access Control", () => {
    it("shows launch button for owners", () => {
      mockGetUserRole.mockReturnValue("owner");
      mockIsOwner.mockReturnValue(true);

      render(<StudioWindow onClose={mockOnClose} />);

      expect(screen.getByText("Launch Studio")).toBeInTheDocument();
    });

    it("shows launch button for editors", () => {
      mockGetUserRole.mockReturnValue("editor");
      mockIsOwner.mockReturnValue(false);

      render(<StudioWindow onClose={mockOnClose} />);

      expect(screen.getByText("Launch Studio")).toBeInTheDocument();
    });

    it("hides launch button for viewers", () => {
      mockGetUserRole.mockReturnValue("viewer");
      mockIsOwner.mockReturnValue(false);

      render(<StudioWindow onClose={mockOnClose} />);

      expect(screen.queryByText("Launch Studio")).not.toBeInTheDocument();
      expect(
        screen.getByText("You can only view this session")
      ).toBeInTheDocument();
    });

    it("only allows owners to end sessions", async () => {
      const user = userEvent.setup();
      mockLaunchStudio.mockResolvedValue({
        success: true,
        streamUrl: "http://localhost:8080",
      });

      // Start as owner and launch studio
      mockGetUserRole.mockReturnValue("owner");
      mockIsOwner.mockReturnValue(true);

      render(<StudioWindow onClose={mockOnClose} />);

      const launchButton = screen.getByText("Launch Studio");
      await user.click(launchButton);

      await waitFor(() => {
        expect(screen.getByText("End Session")).toBeInTheDocument();
      });

      // Change to editor role
      mockGetUserRole.mockReturnValue("editor");
      mockIsOwner.mockReturnValue(false);

      // Re-render to apply role change
      render(<StudioWindow onClose={mockOnClose} />);

      // End session button should not be visible for editors
      expect(screen.queryByText("End Session")).not.toBeInTheDocument();
    });
  });

  describe("Loading States", () => {
    it("shows loading spinner during launch", async () => {
      const user = userEvent.setup();
      mockLaunchStudio.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({ success: true, streamUrl: "http://localhost:8080" }),
              100
            )
          )
      );

      render(<StudioWindow onClose={mockOnClose} />);

      const launchButton = screen.getByText("Launch Studio");
      await user.click(launchButton);

      // Should show loading state
      expect(screen.getByText("Launching Studio...")).toBeInTheDocument();

      // Should disable launch button during loading
      expect(launchButton).toBeDisabled();
    });

    it("re-enables launch button after error", async () => {
      const user = userEvent.setup();
      mockLaunchStudio.mockRejectedValue(new Error("Launch failed"));

      render(<StudioWindow onClose={mockOnClose} />);

      const launchButton = screen.getByText("Launch Studio");
      await user.click(launchButton);

      await waitFor(() => {
        expect(screen.getByText("Try Again")).toBeInTheDocument();
      });

      const retryButton = screen.getByText("Try Again");
      expect(retryButton).not.toBeDisabled();
    });
  });

  describe("IPC Integration", () => {
    it("calls launchStudio IPC with correct session ID", async () => {
      const user = userEvent.setup();
      mockLaunchStudio.mockResolvedValue({
        success: true,
        streamUrl: "http://localhost:8080",
      });

      render(<StudioWindow onClose={mockOnClose} />);

      const launchButton = screen.getByText("Launch Studio");
      await user.click(launchButton);

      expect(mockLaunchStudio).toHaveBeenCalledWith("test-session-id");
      expect(mockLaunchStudio).toHaveBeenCalledTimes(1);
    });

    it("calls endSession IPC with correct session ID", async () => {
      const user = userEvent.setup();
      mockLaunchStudio.mockResolvedValue({
        success: true,
        streamUrl: "http://localhost:8080",
      });
      mockEndSession.mockResolvedValue({ success: true });

      // Mock window.confirm
      Object.defineProperty(window, "confirm", { value: () => true });

      render(<StudioWindow onClose={mockOnClose} />);

      // Launch studio first
      const launchButton = screen.getByText("Launch Studio");
      await user.click(launchButton);

      await waitFor(() => {
        expect(screen.getByText("End Session")).toBeInTheDocument();
      });

      // End session
      const endButton = screen.getByText("End Session");
      await user.click(endButton);

      expect(mockEndSession).toHaveBeenCalledWith("test-session-id");
      expect(mockEndSession).toHaveBeenCalledTimes(1);
    });

    it("handles IPC errors gracefully", async () => {
      const user = userEvent.setup();
      mockLaunchStudio.mockRejectedValue(new Error("IPC communication failed"));

      render(<StudioWindow onClose={mockOnClose} />);

      const launchButton = screen.getByText("Launch Studio");
      await user.click(launchButton);

      await waitFor(() => {
        expect(screen.getByText("Failed to Launch Studio")).toBeInTheDocument();
        expect(
          screen.getByText("IPC communication failed")
        ).toBeInTheDocument();
      });

      expect(mockToast.error).toHaveBeenCalledWith("IPC communication failed");
    });
  });
});
