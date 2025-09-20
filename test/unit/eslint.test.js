import { ESLint } from "eslint";
import { describe, it, expect } from "@jest/globals";

// ESLintによるsrc配下の静的解析テスト

describe("ESLint validation", () => {
  it("should have no linting errors", async () => {
    const eslint = new ESLint({});
    const results = await eslint.lintFiles(["src/**/*.js"]);
    const formatter = await eslint.loadFormatter("stylish");
    const resultText = formatter.format(results);
    const errorCount = results.reduce((sum, file) => sum + file.errorCount, 0);
    if (errorCount > 0) {
      console.log(resultText);
    }
    expect(errorCount).toBe(0);
  });
});
