import React from 'react';

interface NexoraLogoProps {
  size?: number;
  className?: string;
}

export const NexoraLogo: React.FC<NexoraLogoProps> = ({ size = 22, className = '' }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className={className}
    >
      <rect
        x="2"
        y="2"
        width="20"
        height="20"
        rx="5"
        className="fill-violet-600/15 stroke-violet-500/70"
        strokeWidth="1.5"
      />
      <path
        d="M7.5 16.5V7.5L13.5 16.5V7.5"
        className="stroke-violet-600 dark:stroke-violet-400"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M16.5 7.5V16.5"
        className="stroke-sky-500 dark:stroke-sky-400"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
};
