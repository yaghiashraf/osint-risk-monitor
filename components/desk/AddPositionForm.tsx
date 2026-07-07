"use client";

import { useState } from "react";
import { useStore } from "@/lib/store/context";
import { Field, Modal, SelectInput, TextInput } from "@/components/Modal";
import { Button } from "@/components/ui";
import { todayISO } from "@/lib/domain/format";

// Manual position entry so the desk is useful with zero API keys.
export function AddPositionForm({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { addPosition } = useStore();
  const [kind, setKind] = useState<"csp" | "stock">("csp");
  const [symbol, setSymbol] = useState("");
  const [strike, setStrike] = useState("");
  const [expiration, setExpiration] = useState("");
  const [contracts, setContracts] = useState("1");
  const [premium, setPremium] = useState("");
  const [delta, setDelta] = useState("");
  const [shares, setShares] = useState("100");
  const [basis, setBasis] = useState("");

  const reset = () => {
    setSymbol("");
    setStrike("");
    setExpiration("");
    setContracts("1");
    setPremium("");
    setDelta("");
    setShares("100");
    setBasis("");
  };

  const submit = () => {
    const sym = symbol.trim().toUpperCase();
    if (!sym) return;
    if (kind === "csp") {
      if (!strike || !expiration || !premium) return;
      addPosition({
        kind: "csp",
        status: "open",
        symbol: sym,
        strike: Number(strike),
        expiration,
        contracts: Number(contracts) || 1,
        premiumOpen: Number(premium),
        deltaAtOpen: delta ? Number(delta) : undefined,
        openedAt: todayISO(),
      });
    } else {
      if (!basis || !shares) return;
      addPosition({
        kind: "stock",
        status: "assigned",
        symbol: sym,
        shares: Number(shares),
        costBasis: Number(basis),
        openedAt: todayISO(),
      });
    }
    reset();
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="Track a position">
      <Field label="Type">
        <SelectInput value={kind} onChange={(e) => setKind(e.target.value as "csp" | "stock")}>
          <option value="csp">Cash-secured put</option>
          <option value="stock">Assigned stock lot</option>
        </SelectInput>
      </Field>
      <Field label="Symbol">
        <TextInput
          value={symbol}
          onChange={(e) => setSymbol(e.target.value)}
          placeholder="AAPL"
          autoFocus
        />
      </Field>

      {kind === "csp" ? (
        <>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Strike">
              <TextInput
                type="number"
                value={strike}
                onChange={(e) => setStrike(e.target.value)}
                placeholder="230"
              />
            </Field>
            <Field label="Expiration">
              <TextInput
                type="date"
                value={expiration}
                onChange={(e) => setExpiration(e.target.value)}
              />
            </Field>
            <Field label="Contracts">
              <TextInput
                type="number"
                value={contracts}
                onChange={(e) => setContracts(e.target.value)}
              />
            </Field>
            <Field label="Credit / share">
              <TextInput
                type="number"
                value={premium}
                onChange={(e) => setPremium(e.target.value)}
                placeholder="2.40"
              />
            </Field>
            <Field label="Delta at open (opt.)">
              <TextInput
                type="number"
                value={delta}
                onChange={(e) => setDelta(e.target.value)}
                placeholder="0.28"
              />
            </Field>
          </div>
        </>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <Field label="Shares">
            <TextInput
              type="number"
              value={shares}
              onChange={(e) => setShares(e.target.value)}
            />
          </Field>
          <Field label="Cost basis / share">
            <TextInput
              type="number"
              value={basis}
              onChange={(e) => setBasis(e.target.value)}
              placeholder="30.00"
            />
          </Field>
        </div>
      )}

      <div className="mt-2 flex justify-end gap-2">
        <Button variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button variant="primary" onClick={submit}>
          Track
        </Button>
      </div>
    </Modal>
  );
}
