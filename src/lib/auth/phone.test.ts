import { describe, expect, it } from "vitest";
import { formatPhone, maskPhone, normalizeCode, normalizePhone, parseAdminPhones } from "./phone";

describe("normalizePhone", () => {
  it("accepts the ways people type a US number", () => {
    for (const input of ["2125551234", "(212) 555-1234", "212.555.1234", "+1 212 555 1234", "1-212-555-1234", " 212 555 1234 "]) {
      expect(normalizePhone(input)).toBe("+12125551234");
    }
  });
  it("keeps international numbers when the country code is typed", () => {
    expect(normalizePhone("+44 7700 900123")).toBe("+447700900123");
    expect(normalizePhone("+33 6 12 34 56 78")).toBe("+33612345678");
  });
  it("rejects things that aren't numbers", () => {
    for (const input of ["", "hello", "123", "212555", "+1"]) expect(normalizePhone(input)).toBeNull();
  });
});

describe("formatPhone and maskPhone", () => {
  it("formats US nationally and others internationally", () => {
    expect(formatPhone("+12125551234")).toBe("(212) 555-1234");
    expect(formatPhone("+447700900123")).toBe("+44 7700 900123");
  });
  it("masks all but the last four", () => {
    expect(maskPhone("+12125551234")).toBe("•••• 1234");
  });
});

describe("normalizeCode", () => {
  it("takes six digits with or without spaces", () => {
    expect(normalizeCode("123456")).toBe("123456");
    expect(normalizeCode("123 456")).toBe("123456");
    expect(normalizeCode("12345")).toBeNull();
    expect(normalizeCode("1234567")).toBeNull();
    expect(normalizeCode("abcdef")).toBeNull();
  });
});

describe("parseAdminPhones", () => {
  it("normalizes and skips junk", () => {
    expect([...parseAdminPhones("+1 212 555 1234, (917) 555-0100, nope, ")]).toEqual(["+12125551234", "+19175550100"]);
    expect(parseAdminPhones(undefined).size).toBe(0);
  });
});
