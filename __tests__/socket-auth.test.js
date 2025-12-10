jest.mock(
  "firebase-admin",
  () => ({
    apps: [],
    initializeApp: jest.fn(),
    credential: { cert: jest.fn() },
    auth: jest.fn(() => ({ verifyIdToken: jest.fn() })),
  }),
  { virtual: true }
);
const admin = require("firebase-admin");

describe("Socket auth middleware", () => {
  const next = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.VITE_USE_MOCK_DATA;
    delete process.env.USE_MOCK_DATA;
  });

  it("allows connection in mock mode with userId", async () => {
    process.env.VITE_USE_MOCK_DATA = "true";
    jest.resetModules();
    const { socketAuthMiddleware } = require("../server/index.js");
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
    jest.resetModules();
    const { socketAuthMiddleware } = require("../server/index.js");
    const socket = { handshake: { auth: { displayName: "User" } } };
    await socketAuthMiddleware(socket, next);
    expect(next).toHaveBeenCalled();
    const err = next.mock.calls[0][0];
    expect(err).toBeInstanceOf(Error);
  });

  it("fails when verification throws", async () => {
    delete process.env.VITE_USE_MOCK_DATA;
    delete process.env.USE_MOCK_DATA;
    jest.resetModules();
    const mockAuth = {
      verifyIdToken: jest.fn().mockRejectedValue(new Error("bad token")),
    };
    admin.auth.mockImplementation(() => mockAuth);
    const { socketAuthMiddleware } = require("../server/index.js");
    const socket = { handshake: { auth: { idToken: "bad" } } };
    await socketAuthMiddleware(socket, next);
    expect(next).toHaveBeenCalled();
    const err = next.mock.calls[0][0];
    expect(err).toBeInstanceOf(Error);
  });
});

jest.mock(
  "express",
  () => {
    const fn = () => ({ use: jest.fn(), get: jest.fn(), post: jest.fn() });
    fn.json = () => jest.fn();
    return fn;
  },
  { virtual: true }
);
jest.mock(
  "http",
  () => ({ createServer: jest.fn(() => ({ listen: jest.fn() })) }),
  {
    virtual: true,
  }
);
jest.mock(
  "socket.io",
  () => jest.fn(() => ({ use: jest.fn(), on: jest.fn() })),
  {
    virtual: true,
  }
);
jest.mock("cors", () => () => {}, { virtual: true });
jest.mock("jsonwebtoken", () => ({}), { virtual: true });
jest.mock(
  "crypto",
  () => ({ randomBytes: () => ({ toString: () => "state" }) }),
  { virtual: true }
);
jest.mock("querystring", () => ({ stringify: () => "" }), { virtual: true });
