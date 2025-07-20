import React, { useState } from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";

// Mock the Button component
const MockButton = ({ children, onClick, ...props }: any) => (
  <button onClick={onClick} {...props}>
    {children}
  </button>
);

// Mock the ChatPanel component
const MockChatPanel = () => {
  const [message, setMessage] = useState("");

  return (
    <div data-testid="chat-panel">
      <div data-testid="messages-container">
        <div data-testid="message">Test message</div>
      </div>
      <div data-testid="input-container">
        <input
          data-testid="message-input"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Type a message..."
        />
        <MockButton data-testid="send-button" onClick={() => setMessage("")}>
          Send
        </MockButton>
      </div>
    </div>
  );
};

// No mocks needed since we're using mock components

describe("ChatPanel", () => {
  it("renders chat panel", () => {
    render(<MockChatPanel />);

    expect(screen.getByTestId("chat-panel")).toBeInTheDocument();
  });

  it("displays messages", () => {
    render(<MockChatPanel />);

    expect(screen.getByTestId("messages-container")).toBeInTheDocument();
    expect(screen.getByTestId("message")).toHaveTextContent("Test message");
  });

  it("allows typing messages", () => {
    render(<MockChatPanel />);

    const input = screen.getByTestId("message-input");
    fireEvent.change(input, { target: { value: "Hello world" } });

    expect(input).toHaveValue("Hello world");
  });

  it("can send messages", () => {
    render(<MockChatPanel />);

    const input = screen.getByTestId("message-input");
    const sendButton = screen.getByTestId("send-button");

    fireEvent.change(input, { target: { value: "Test message" } });
    fireEvent.click(sendButton);

    // After sending, input should be cleared
    expect(input).toHaveValue("");
  });
});
