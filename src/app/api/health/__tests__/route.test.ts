/**
 * @jest-environment node
 */
import { GET } from "../route";

describe("/api/health", () => {
  it("answers ok without caching or calling the backend", async () => {
    const fetchSpy = jest.spyOn(global, "fetch");
    const response = GET();

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store, max-age=0");
    const body = await response.json();
    expect(body.status).toBe("ok");
    expect(Number.isNaN(Date.parse(body.time))).toBe(false);
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });
});
