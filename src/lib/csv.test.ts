import { describe, expect, it } from "vitest";

import { csvCell, csvRow } from "./csv";

describe("csvCell", () => {
  it("leaves plain values alone", () => {
    expect(csvCell("Carrefour")).toBe("Carrefour");
    expect(csvCell(-42.75)).toBe("-42.75");
    expect(csvCell(null)).toBe("");
  });

  it("quotes commas, quotes and line breaks", () => {
    expect(csvCell("Hashem, Downtown")).toBe('"Hashem, Downtown"');
    expect(csvCell('The "Best" Cafe')).toBe('"The ""Best"" Cafe"');
    expect(csvCell("line1\nline2")).toBe('"line1\nline2"');
  });

  it("neutralises spreadsheet formulas in text", () => {
    expect(csvCell('=HYPERLINK("http://evil")')).toBe('"\'=HYPERLINK(""http://evil"")"');
    expect(csvCell("+1 cmd")).toBe("'+1 cmd");
    expect(csvCell("@SUM(A1)")).toBe("'@SUM(A1)");
    expect(csvCell("-2+3")).toBe("'-2+3");
  });

  it("does not touch real negative numbers", () => {
    expect(csvCell(-12.3)).toBe("-12.3");
  });
});

describe("csvRow", () => {
  it("joins cells and ends with CRLF", () => {
    expect(csvRow(["a", 1, "b,c"])).toBe('a,1,"b,c"\r\n');
  });
});
