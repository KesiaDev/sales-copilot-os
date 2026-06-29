const SELLER_PHOTOS: Record<string, string> = {
  nadal: "/avatars/nadal.jpg",
  fabio: "/avatars/nadal.jpg",
  gisele: "/avatars/gisele.jpg",
  rita: "/avatars/rita.jpg",
  luana: "/avatars/luana.jpg",
  joao: "/avatars/joao.jpg",
};

function norm(s: string) {
  return s
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

export function getSellerPhoto(nome: string | null | undefined): string | undefined {
  if (!nome) return undefined;
  const key = norm(nome);
  for (const [k, url] of Object.entries(SELLER_PHOTOS)) {
    if (key.includes(norm(k))) return url;
  }
  return undefined;
}
