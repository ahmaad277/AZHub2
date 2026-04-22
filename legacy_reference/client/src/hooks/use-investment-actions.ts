import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";

export function useInvestmentActions() {
  const checkStatuses = useMutation({
    mutationFn: async () => apiRequest("POST", "/api/investments/check-status", {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/investments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/cashflows"] });
      queryClient.invalidateQueries({ queryKey: ["/api/alerts"] });
    },
  });

  const completeAllPending = useMutation({
    mutationFn: async (investmentId: string) =>
      apiRequest("POST", `/api/investments/${investmentId}/complete-all-payments`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/investments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/cashflows"] });
      queryClient.invalidateQueries({ queryKey: ["/api/cash/transactions"] });
    },
  });

  return {
    checkStatuses,
    completeAllPending,
  };
}
