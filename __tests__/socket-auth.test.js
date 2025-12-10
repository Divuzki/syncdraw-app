const admin = require("firebase-admin");
jest.mock("firebase-admin", () => ({
  auth: jest.fn(() => ({ verifyIdToken: jest.fn() })),
}));

const { socketAuthMiddleware } = require("../server/index.js");

describe("Socket auth middleware", () => {
  const next = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.VITE_USE_MOCK_DATA;
    delete process.env.USE_MOCK_DATA;
  });

  it("allows connection in mock mode with userId", async () => {
    process.env.VITE_USE_MOCK_DATA = "true";
    const socket = {
      handshake: {
        auth: { userId: "u1", displayName: "User", photoURL: null },
      },
    };
    await socketAuthMiddleware(socket, next);
    expect(next).toHaveBeenCalledWith();
    expect(socket.userId).toBe("u1");
  });

  it("rejects connection in mock mode without userId", async () => {
    process.env.USE_MOCK_DATA = "true";
    const socket = { handshake: { auth: { displayName: "User" } } };
    await socketAuthMiddleware(socket, next);
    expect(next).toHaveBeenCalled();
    const err = next.mock.calls[0][0];
    expect(err).toBeInstanceOf(Error);
  });

  it("verifies idToken in real mode", async () => {
    const mockVerify = admin.auth().verifyIdToken;
    mockVerify.mockResolvedValue({ uid: "u2", name: "Alice", picture: "p" });
    const socket = { handshake: { auth: { idToken: "token123" } } };
    await socketAuthMiddleware(socket, next);
    expect(mockVerify).toHaveBeenCalledWith("token123");
    expect(next).toHaveBeenCalledWith();
    expect(socket.userId).toBe("u2");
  });

  it("fails when verification throws", async () => {
    const mockVerify = admin.auth().verifyIdToken;
    mockVerify.mockRejectedValue(new Error("bad token"));
    const socket = { handshake: { auth: { idToken: "bad" } } };
    await socketAuthMiddleware(socket, next);
    expect(next).toHaveBeenCalled();
    const err = next.mock.calls[0][0];
    expect(err).toBeInstanceOf(Error);
  });
});
