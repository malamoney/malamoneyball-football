"use client";

import { useState } from "react";

interface TeamAvatarProps {
  userName: string;
  className?: string;
}

export function TeamAvatar({
  userName,
  className = "size-9 text-xs",
}: TeamAvatarProps) {
  const [imageFailed, setImageFailed] = useState(false);

  if (imageFailed) {
    return (
      <span
        className={`grid shrink-0 place-items-center rounded-full bg-violet-50 font-bold uppercase text-violet-700 ring-1 ring-violet-100 ${className}`}
      >
        {userName.slice(0, 2)}
      </span>
    );
  }

  return (
    <span
      className={`shrink-0 overflow-hidden rounded-full bg-violet-50 ring-1 ring-violet-100 ${className}`}
    >
      <img
        src={`https://api.draftkings.com/user/images/Small/${encodeURIComponent(userName)}.jpeg`}
        alt=""
        className="size-full object-cover"
        onError={() => setImageFailed(true)}
        referrerPolicy="no-referrer"
      />
    </span>
  );
}
