"use client";

import { useUserContext } from "../lib/context/UserContext";

export function useUser() {
  const { user, loading } = useUserContext();

  return { user, loading };
}
