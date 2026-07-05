export type Notice = { text: string; error: boolean } | null;

export function Message({ notice }: { notice: Notice }) {
  if (!notice) return null;
  return <div className={`msg${notice.error ? " msg--error" : ""}`}>{notice.text}</div>;
}
