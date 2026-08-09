import { useEffect, useState } from "react";

type Props = {
  ip: string | null;
};

export function IpCard({ ip }: Props) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 2000);
    return () => window.clearTimeout(timer);
  }, [copied]);

  const display = ip ?? "判定できません";
  const canCopy = ip !== null;

  async function handleCopy() {
    if (!canCopy) return;
    try {
      await navigator.clipboard.writeText(ip);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <section className="ip-card" aria-labelledby="ip-heading">
      <h2 id="ip-heading" className="ip-card__label">
        グローバルIPアドレス
      </h2>
      <div className="ip-card__row">
        <p className="ip-card__value" data-testid="ip-address">
          {display}
        </p>
        <button
          type="button"
          className="ip-card__copy"
          onClick={handleCopy}
          disabled={!canCopy}
          aria-label="IPアドレスをコピー"
        >
          コピー
        </button>
      </div>
      {copied ? (
        <p className="ip-card__feedback" role="status" data-testid="copy-feedback">
          コピーしました
        </p>
      ) : null}
    </section>
  );
}
