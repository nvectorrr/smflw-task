export function MichaelAvatar({ xl }: { xl?: boolean }) {
  return (
    <div
      className={`avatar avatar--michael${xl ? " avatar--xl" : ""}`}
      aria-hidden="true"
    >
      <img src="/scott.jpg" alt="" />
    </div>
  );
}
