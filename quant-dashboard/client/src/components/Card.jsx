export default function Card({ children, className = '' }) {
  return (
    <div className={`card-panel ${className}`}>
      {children}
    </div>
  );
}
