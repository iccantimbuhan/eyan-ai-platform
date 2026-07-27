import { useQuery } from "@tanstack/react-query";
import { getUsers } from "../api/users-api";

export function useUsers() {
  return useQuery({
    queryKey: ["users"],
    queryFn: getUsers,
  });
}
