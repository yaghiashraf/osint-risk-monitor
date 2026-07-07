"use client";

// Client store. localStorage is the source of truth in demo/free mode, which
// makes the whole app usable with ZERO backend keys. When Supabase + Clerk are
// configured the same shape syncs server-side (see supabase/schema.sql); the
// screens only ever talk to this context.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { Plan, Position, Profile } from "../domain/types";
import { todayISO } from "../domain/format";
import { assignmentBasis, assignmentShares } from "../domain/wheel";
import { uid } from "./ids";
import { buildDemoPositions } from "./demo";

const STORAGE_KEY = "wheeldesk:v1";
const DEMO_USER_ID = "demo-user";

interface PersistShape {
  positions: Position[];
  plan: Plan;
  dismissedAlertIds: string[];
}

interface StoreValue {
  ready: boolean;
  profile: Profile;
  positions: Position[];
  dismissedAlertIds: string[];
  isDemo: boolean;
  addPosition(p: Omit<Position, "id" | "userId" | "createdAt">): Position;
  updatePosition(id: string, patch: Partial<Position>): void;
  removePosition(id: string): void;
  closePosition(id: string, premiumClose: number): void;
  assignPosition(cspId: string): Position | null;
  sellCoveredCall(
    lotId: string,
    cc: {
      strike: number;
      expiration: string;
      premium: number;
      contracts: number;
      delta?: number;
    },
  ): Position | null;
  loadDemo(): void;
  reset(): void;
  setPlan(plan: Plan): void;
  dismissAlert(id: string): void;
}

const StoreContext = createContext<StoreValue | null>(null);

function loadPersisted(): PersistShape {
  if (typeof window === "undefined") {
    return { positions: [], plan: "free", dismissedAlertIds: [] };
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { positions: [], plan: "free", dismissedAlertIds: [] };
    const parsed = JSON.parse(raw) as Partial<PersistShape>;
    return {
      positions: parsed.positions ?? [],
      plan: parsed.plan ?? "free",
      dismissedAlertIds: parsed.dismissedAlertIds ?? [],
    };
  } catch {
    return { positions: [], plan: "free", dismissedAlertIds: [] };
  }
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [positions, setPositions] = useState<Position[]>([]);
  const [plan, setPlanState] = useState<Plan>("free");
  const [dismissedAlertIds, setDismissed] = useState<string[]>([]);

  // Hydrate from localStorage once on mount.
  useEffect(() => {
    const p = loadPersisted();
    setPositions(p.positions);
    setPlanState(p.plan);
    setDismissed(p.dismissedAlertIds);
    setReady(true);
  }, []);

  // Persist on any change (after hydration).
  useEffect(() => {
    if (!ready || typeof window === "undefined") return;
    const shape: PersistShape = { positions, plan, dismissedAlertIds };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(shape));
  }, [ready, positions, plan, dismissedAlertIds]);

  const addPosition: StoreValue["addPosition"] = useCallback((p) => {
    const pos: Position = {
      ...p,
      id: uid("pos"),
      userId: DEMO_USER_ID,
      createdAt: new Date().toISOString(),
    };
    setPositions((prev) => [pos, ...prev]);
    return pos;
  }, []);

  const updatePosition: StoreValue["updatePosition"] = useCallback((id, patch) => {
    setPositions((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  }, []);

  const removePosition: StoreValue["removePosition"] = useCallback((id) => {
    setPositions((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const closePosition: StoreValue["closePosition"] = useCallback((id, premiumClose) => {
    setPositions((prev) =>
      prev.map((p) =>
        p.id === id
          ? { ...p, premiumClose, status: "closed", closedAt: todayISO() }
          : p,
      ),
    );
  }, []);

  const assignPosition: StoreValue["assignPosition"] = useCallback((cspId) => {
    let created: Position | null = null;
    setPositions((prev) => {
      const csp = prev.find((p) => p.id === cspId);
      if (!csp || csp.kind !== "csp") return prev;
      const lot: Position = {
        id: uid("pos"),
        userId: DEMO_USER_ID,
        kind: "stock",
        status: "assigned",
        symbol: csp.symbol,
        shares: assignmentShares(csp),
        costBasis: assignmentBasis(csp),
        parentPositionId: csp.id,
        openedAt: todayISO(),
        createdAt: new Date().toISOString(),
      };
      created = lot;
      return [
        lot,
        ...prev.map((p) =>
          p.id === cspId
            ? { ...p, status: "assigned" as const, closedAt: todayISO() }
            : p,
        ),
      ];
    });
    return created;
  }, []);

  const sellCoveredCall: StoreValue["sellCoveredCall"] = useCallback((lotId, cc) => {
    let created: Position | null = null;
    setPositions((prev) => {
      const lot = prev.find((p) => p.id === lotId);
      if (!lot || lot.kind !== "stock") return prev;
      const pos: Position = {
        id: uid("pos"),
        userId: DEMO_USER_ID,
        kind: "cc",
        status: "open",
        symbol: lot.symbol,
        strike: cc.strike,
        expiration: cc.expiration,
        contracts: cc.contracts,
        premiumOpen: cc.premium,
        deltaAtOpen: cc.delta,
        parentPositionId: lot.id,
        openedAt: todayISO(),
        createdAt: new Date().toISOString(),
      };
      created = pos;
      return [pos, ...prev];
    });
    return created;
  }, []);

  const loadDemo = useCallback(() => {
    setPositions(buildDemoPositions(DEMO_USER_ID));
    setDismissed([]);
  }, []);

  const reset = useCallback(() => {
    setPositions([]);
    setDismissed([]);
  }, []);

  const setPlan = useCallback((p: Plan) => setPlanState(p), []);

  const dismissAlert = useCallback((id: string) => {
    setDismissed((prev) => (prev.includes(id) ? prev : [...prev, id]));
  }, []);

  const profile: Profile = useMemo(
    () => ({
      id: DEMO_USER_ID,
      clerkUserId: DEMO_USER_ID,
      plan,
      settings: {},
      createdAt: "",
    }),
    [plan],
  );

  const value: StoreValue = useMemo(
    () => ({
      ready,
      profile,
      positions,
      dismissedAlertIds,
      isDemo: true,
      addPosition,
      updatePosition,
      removePosition,
      closePosition,
      assignPosition,
      sellCoveredCall,
      loadDemo,
      reset,
      setPlan,
      dismissAlert,
    }),
    [
      ready,
      profile,
      positions,
      dismissedAlertIds,
      addPosition,
      updatePosition,
      removePosition,
      closePosition,
      assignPosition,
      sellCoveredCall,
      loadDemo,
      reset,
      setPlan,
      dismissAlert,
    ],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used within <StoreProvider>");
  return ctx;
}
