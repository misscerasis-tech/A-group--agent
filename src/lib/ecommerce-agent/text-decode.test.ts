import { describe, expect, it } from "vitest";
import { decodeUploadedTableText } from "./text-decode";

describe("uploaded table text decoding", () => {
  it("keeps utf-8 table text", () => {
    const bytes = new TextEncoder().encode("周期,商品名称\n本周,黑杯\n");
    const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);

    expect(decodeUploadedTableText(buffer)).toBe("周期,商品名称\n本周,黑杯\n");
  });

  it("falls back to gb18030 when a Chinese platform csv is not utf-8", () => {
    const gb18030Bytes = new Uint8Array([
      0xd6, 0xdc, 0xc6, 0xda, 0x2c, 0xc9, 0xcc, 0xc6, 0xb7, 0xc3, 0xfb, 0xb3, 0xc6, 0x0a,
    ]);
    const buffer = gb18030Bytes.buffer.slice(
      gb18030Bytes.byteOffset,
      gb18030Bytes.byteOffset + gb18030Bytes.byteLength,
    );

    expect(decodeUploadedTableText(buffer)).toBe("周期,商品名称\n");
  });
});
