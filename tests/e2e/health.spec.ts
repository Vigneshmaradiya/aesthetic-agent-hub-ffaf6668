import { test, expect } from "@playwright/test";

test.describe("Health API", () => {
  test("GET /api/health returns 200 with status healthy", async ({
    request,
  }) => {
    const response = await request.get("/api/health");
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body.status).toBe("healthy");
  });

  test("GET /api/health response includes timestamp and uptime", async ({
    request,
  }) => {
    const response = await request.get("/api/health");
    const body = await response.json();

    expect(body).toHaveProperty("timestamp");
    expect(typeof body.timestamp).toBe("string");
    expect(new Date(body.timestamp).getTime()).not.toBeNaN();

    expect(body).toHaveProperty("uptime");
    expect(typeof body.uptime).toBe("number");
    expect(body.uptime).toBeGreaterThanOrEqual(0);
  });
});
