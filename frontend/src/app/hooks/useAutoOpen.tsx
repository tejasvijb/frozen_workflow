"use client"

import { useEffect, useState } from "react";

export default function useAutoOpen(cond: boolean) {
  const [state, setOpen] = useState(false);

  // Auto show/hide sidebar
  useEffect(() => {
    setOpen(cond);
  }, [cond]);

  function close() {
    setOpen(false);
  }

  return [state, close] as const;
}
