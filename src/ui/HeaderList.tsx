import type { WhoamiHeader } from "./types";

type Props = {
  headers: WhoamiHeader[];
};

export function HeaderList({ headers }: Props) {
  return (
    <section className="header-list" aria-labelledby="headers-heading">
      <h2 id="headers-heading" className="header-list__title">
        送信ヘッダ
      </h2>
      {headers.length === 0 ? (
        <p className="header-list__empty">ヘッダはありません</p>
      ) : (
        <table className="header-list__table" data-testid="header-list">
          <thead>
            <tr>
              <th scope="col">名前</th>
              <th scope="col">値</th>
            </tr>
          </thead>
          <tbody>
            {headers.map((h) => (
              <tr key={h.name}>
                <td className="header-list__name">{h.name}</td>
                <td className="header-list__value">{h.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
