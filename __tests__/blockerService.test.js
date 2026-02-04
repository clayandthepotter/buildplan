const { checkBlocker } = require("../src/services/blockerService");

describe("Blocker Service", () => {
  test("should identify blockers for a task", async () => {
    const taskDetails = { taskId: "TASK-1770152858774-01", projectCode: "PROJ-123" };
    const blockers = await checkBlocker(taskDetails);
    expect(blockers).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: expect.any(String),
        description: expect.any(String)
      })
    ]));
  });
});