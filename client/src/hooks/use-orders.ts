import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { dbService, type CreateOrderInput } from "@/lib/services/dbService";

export function useOrders(status?: string, role?: string, userId?: string) {
  return useQuery({
    queryKey: ["orders", status, role, userId],
    queryFn: async () => dbService.listOrders({ status, role, userId }),
  });
}

export function useOrder(id?: string) {
  return useQuery({
    queryKey: ["orders", id],
    queryFn: async () => {
      if (!id) return null;
      return dbService.getOrder(id);
    },
    enabled: !!id,
  });
}

export function useCreateOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateOrderInput) => dbService.createOrder(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    },
  });
}

export function useUpdateOrderStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status, verifiedBy }: { id: string; status: string; verifiedBy?: string }) => {
      return dbService.updateOrderStatus({ id, status, verifiedBy });
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["orders", variables.id] });
    },
  });
}
