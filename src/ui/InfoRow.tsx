type Props = {
  label: string;
  value: string | null;
};

export function InfoRow({ label, value }: Props) {
  const display = value ?? "不明";
  return (
    <div className="info-row">
      <dt className="info-row__label">{label}</dt>
      <dd className="info-row__value" data-testid={`info-${label}`}>
        {display}
      </dd>
    </div>
  );
}
