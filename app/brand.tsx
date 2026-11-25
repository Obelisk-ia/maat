export function Brand() {
  return (
    <>
      <span className="brand-mark">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          {/* Maat's ostrich feather. */}
          <g transform="translate(-0.7 -0.25)">
            <path d="M13.9 19.2V10C13.9 7.2 12.6 5.3 10.3 4.7C9.2 4.5 8.2 4.9 7.6 5.9C7.8 3.4 9.7 1.8 12.1 1.8C15.8 1.8 17.8 5 17.8 9.2L15.6 10.6L17.7 10.8C17.5 11.7 17.3 12.6 17 13.4L15 14.7L16.6 14.6C15.9 16.3 15 17.8 13.9 19.2Z" />
            <path d="M12.2 18.6C10.1 15.3 8.9 11.9 8.9 8.8C8.9 7.9 8.7 7.2 8.3 6.7C10.9 6.4 12.2 8.1 12.2 11Z" />
            <rect x="12.45" y="14" width="1.2" height="8.7" rx="0.6" />
          </g>
        </svg>
      </span>
      <span className="brand-word">maat</span>
    </>
  );
}
