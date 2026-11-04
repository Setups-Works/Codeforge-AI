import { buildFunnel, percentOf, summariseRevenue, type OrderFact } from "@/lib/lms/analytics";

const d = (s: string) => new Date(s);
const order = (over: Partial<OrderFact>): OrderFact => ({ amountInr: 100, status: "paid", paidAt: d("2026-11-05T00:00:00Z"), refundedAt: null, ...over });

describe("percentOf", () => {
  it("rounds and guards against zero", () => {
    expect(percentOf(1, 3)).toBe(33);
    expect(percentOf(5, 0)).toBe(0);
    expect(percentOf(0, 10)).toBe(0);
  });
});

describe("summariseRevenue", () => {
  const orders = [
    order({ amountInr: 500 }),
    order({ amountInr: 300, status: "refunded", paidAt: d("2026-10-01T00:00:00Z"), refundedAt: d("2026-11-04T00:00:00Z") }),
    order({ amountInr: 200, status: "refunded", paidAt: d("2026-11-02T00:00:00Z"), refundedAt: d("2026-11-03T00:00:00Z") }),
    order({ amountInr: 999, status: "created", paidAt: null }),
    order({ amountInr: 999, status: "failed", paidAt: null }),
  ];
  it("ignores unpaid orders", () => {
    expect(summariseRevenue(orders, null)).toMatchObject({ gross: 1000, refunded: 500, net: 500, paidOrders: 3, refundedOrders: 2 });
  });
  it("counts refunds in the window they happened, even for older payments", () => {
    expect(summariseRevenue(orders, d("2026-11-01T00:00:00Z"))).toMatchObject({ gross: 700, refunded: 500, net: 200, paidOrders: 2, refundedOrders: 2 });
  });
  it("is zero for an empty or out-of-window set", () => {
    expect(summariseRevenue([], null)).toEqual({ gross: 0, refunded: 0, net: 0, paidOrders: 0, refundedOrders: 0 });
    expect(summariseRevenue(orders, d("2027-01-01T00:00:00Z")).gross).toBe(0);
  });
});

describe("buildFunnel", () => {
  const lessons = [{ id: "a", title: "A" }, { id: "b", title: "B" }, { id: "c", title: "C" }];
  it("reports completion and drop-off in order", () => {
    const f = buildFunnel(lessons, new Map([["a", 10], ["b", 6], ["c", 6]]), 10);
    expect(f.map((s) => [s.percent, s.dropOff])).toEqual([[100, 0], [60, 40], [60, 0]]);
  });
  it("never reports negative drop-off or more than the enrolled count", () => {
    const f = buildFunnel(lessons, new Map([["a", 2], ["b", 9], ["c", 0]]), 4);
    expect(f.map((s) => s.completed)).toEqual([2, 4, 0]);
    expect(f.every((s) => s.dropOff >= 0)).toBe(true);
  });
  it("is all zeros with nobody enrolled", () => {
    expect(buildFunnel(lessons, new Map(), 0).map((s) => s.percent)).toEqual([0, 0, 0]);
  });
});
