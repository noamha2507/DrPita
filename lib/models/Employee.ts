import { supabase } from '../db/supabase';
import { EmployeeRole } from '../enums';

// [תרשים מחלקות] Employee — עובד (כולל נהגים) · טבלה: employees.
export class Employee {
  employeeId: number;
  fullName: string;
  role: EmployeeRole;
  licenseType: string | null;
  isActive: boolean;

  constructor(data: Partial<Employee> & { employeeId: number }) {
    this.employeeId = data.employeeId;
    this.fullName = data.fullName || '';
    this.role = data.role || EmployeeRole.ProductionWorker;
    this.licenseType = data.licenseType || null;
    this.isActive = data.isActive ?? true;
  }

  // CD method
  async getAssignedVehicle(): Promise<any> {
    const { data, error } = await supabase
      .from('deliveries')
      .select('vehicle:vehicles(*)')
      .eq('driver_id', this.employeeId)
      .in('status', ['Assigned', 'Loaded', 'On The Way'])
      .limit(1)
      .single();
    if (error) return null;
    return data?.vehicle;
  }

  // CD method
  async getActiveDeliveries(): Promise<any[]> {
    const { data, error } = await supabase
      .from('deliveries')
      .select('*')
      .eq('driver_id', this.employeeId)
      .not('status', 'in', '("Delivered","Failed")')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  }

  static async findById(employeeId: number): Promise<Employee | null> {
    const { data, error } = await supabase
      .from('employees')
      .select('*')
      .eq('employee_id', employeeId)
      .single();
    if (error) return null;
    return new Employee({
      employeeId: data.employee_id,
      fullName: data.full_name,
      role: data.role as EmployeeRole,
      licenseType: data.license_type,
      isActive: data.is_active,
    });
  }

  static async findDrivers(): Promise<Employee[]> {
    const { data, error } = await supabase
      .from('employees')
      .select('*')
      .eq('role', 'Driver')
      .eq('is_active', true);
    if (error) throw error;
    return (data || []).map((d: any) => new Employee({
      employeeId: d.employee_id,
      fullName: d.full_name,
      role: d.role as EmployeeRole,
      licenseType: d.license_type,
      isActive: d.is_active,
    }));
  }
}
