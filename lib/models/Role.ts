import { supabase } from '../db/supabase';

export class Role {
  roleId: number;
  roleName: string;

  constructor(data: Partial<Role> & { roleId: number }) {
    this.roleId = data.roleId;
    this.roleName = data.roleName || '';
  }

  getPermissions(): string[] {
    const permissionMap: Record<string, string[]> = {
      Manager: ['orders', 'production', 'delivery', 'verify'],
      ProductionWorker: ['production'],
      WarehouseWorker: ['production'],
      Driver: ['delivery'],
    };
    return permissionMap[this.roleName] || [];
  }

  static async findAll(): Promise<Role[]> {
    const { data, error } = await supabase
      .from('roles')
      .select('*');
    if (error) throw error;
    return (data || []).map((d: any) => new Role({
      roleId: d.role_id,
      roleName: d.role_name,
    }));
  }
}
