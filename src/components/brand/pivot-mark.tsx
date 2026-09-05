/** The Pivot mark, from the original app's logo block. */
export function PivotMark({ size = 26, className }: { size?: number; className?: string }) {
  const blade = { x: 44, y: 6, width: 12, height: 16, rx: 2, fill: "#5CC8F2" };
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} className={className} aria-hidden xmlns="http://www.w3.org/2000/svg">
      {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
        <rect key={deg} {...blade} transform={`rotate(${deg} 50 50)`} />
      ))}
      <circle cx="50" cy="50" r="30" fill="#5CC8F2" />
      <circle cx="50" cy="50" r="11" fill="#FFD84D" />
      <circle cx="50" cy="50" r="3" fill="#082A3D" />
    </svg>
  );
}
