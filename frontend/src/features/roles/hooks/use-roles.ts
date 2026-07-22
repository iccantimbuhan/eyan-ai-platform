import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { createRole, deleteRole, getRoles, updateRole, updateRolePermissions } from '../api/roles-api'
import type { RoleFormValues } from '../schemas/role-schema'
export function useRoles() { return useQuery({ queryKey: ['roles'], queryFn: getRoles }) }
function useInvalidateRoles() { const client = useQueryClient(); return () => client.invalidateQueries({ queryKey: ['roles'] }) }
export function useCreateRole() { const invalidate = useInvalidateRoles(); return useMutation({ mutationFn: createRole, onSuccess: async () => { toast.success('Role created successfully.'); await invalidate() }, onError: () => toast.error('Failed to create role.') }) }
export function useUpdateRole() { const invalidate = useInvalidateRoles(); return useMutation({ mutationFn: ({ id, values }: { id: string; values: RoleFormValues }) => Promise.all([updateRole(id, { name: values.name, description: values.description, isActive: values.isActive }), updateRolePermissions(id, values.permissions)]), onSuccess: async () => { toast.success('Role updated successfully.'); await invalidate() }, onError: () => toast.error('Failed to update role.') }) }
export function useDeleteRole() { const invalidate = useInvalidateRoles(); return useMutation({ mutationFn: deleteRole, onSuccess: async () => { toast.success('Role deleted successfully.'); await invalidate() }, onError: () => toast.error('Failed to delete role.') }) }
