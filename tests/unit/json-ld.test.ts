import { serializeJsonLd } from "@/lib/json-ld";

describe("serializeJsonLd", () => {
  it("produces valid, round-trippable JSON", () => {
    const data = { "@type": "BlogPosting", headline: "Hello", n: 42 };
    expect(JSON.parse(serializeJsonLd(data))).toEqual(data);
  });

  it("escapes </script> so it cannot break out of the tag", () => {
    const out = serializeJsonLd({ headline: "</script><script>alert(1)</script>" });
    expect(out).not.toContain("</script>");
    expect(out).not.toContain("<");
    // The payload is preserved once parsed — only the wire form is escaped.
    expect(JSON.parse(out).headline).toBe("</script><script>alert(1)</script>");
  });

  it("escapes <, >, and & to their \\uXXXX form", () => {
    const out = serializeJsonLd({ v: "<>&" });
    expect(out).toContain("\\u003c");
    expect(out).toContain("\\u003e");
    expect(out).toContain("\\u0026");
  });

  it("escapes the U+2028 and U+2029 line separators", () => {
    const raw = "a" + String.fromCharCode(0x2028) + "b" + String.fromCharCode(0x2029) + "c";
    const out = serializeJsonLd({ v: raw });
    expect(out).toContain("\\u2028");
    expect(out).toContain("\\u2029");
    expect(JSON.parse(out).v).toBe(raw);
  });

  it("leaves ordinary content untouched", () => {
    expect(serializeJsonLd({ name: "Setups Works Lab" })).toBe('{"name":"Setups Works Lab"}');
  });
});
