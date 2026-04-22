import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";

export function useCashActions() {
  const generateAlerts = useMutation({
    mutationFn: async () => apiRequest("POST", "/api/alerts/generate", {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/alerts"] });
    },
  });

  const createCashTransaction = useMutation({
    mutationFn: async (payload: Record<string, unknown>) =>
      apiRequest("POST", "/api/cash/transactions", payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cash/transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/cash/balance"] });
    },
  });

  return {
    generateAlerts,
    createCashTransaction,
  };
}
