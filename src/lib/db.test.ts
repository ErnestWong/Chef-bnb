import { describe, expect, it } from "vitest";
import { hardenConnectionString } from "./db";

describe("hardenConnectionString", () => {
  it("leaves local connections alone", () => {
    const local = "postgresql://postgres:postgres@localhost:54329/chef_bnb_dev";
    expect(hardenConnectionString(local)).toBe(local);
    expect(hardenConnectionString("postgresql://u:p@127.0.0.1:5432/db")).toBe("postgresql://u:p@127.0.0.1:5432/db");
  });
  it("requires TLS for anything else", () => {
    expect(hardenConnectionString("postgresql://u:p@ep-x.us-east-1.aws.neon.tech/neondb")).toBe("postgresql://u:p@ep-x.us-east-1.aws.neon.tech/neondb?sslmode=require");
    expect(hardenConnectionString("postgresql://u:p@db.example.com/x?sslmode=verify-full")).toBe("postgresql://u:p@db.example.com/x?sslmode=verify-full");
    expect(hardenConnectionString("postgresql://u:p@db.example.com/x?sslmode=require&channel_binding=require")).toContain("sslmode=require");
  });
  it("refuses a remote connection that turns TLS off", () => {
    for (const mode of ["disable", "allow", "prefer"]) {
      expect(() => hardenConnectionString(`postgresql://u:p@db.example.com/x?sslmode=${mode}`)).toThrow(/sslmode/);
    }
  });
});
