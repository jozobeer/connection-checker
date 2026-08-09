export type WhoamiHeader = { name: string; value: string };

export type WhoamiResponse = {
  ip: string | null;
  country: string | null;
  headers: WhoamiHeader[];
};
