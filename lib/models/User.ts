import { supabase } from '../db/supabase';

// [תרשים מחלקות] User — משתמש — מסך כניסה והזדהות · טבלה: users.
export class User {
  userId: number;
  username: string;
  passwordHash: string;
  isActive: boolean;
  roleId: number;
  employeeId: number;

  constructor(data: Partial<User> & { userId: number }) {
    this.userId = data.userId;
    this.username = data.username || '';
    this.passwordHash = data.passwordHash || '';
    this.isActive = data.isActive ?? true;
    this.roleId = data.roleId || 0;
    this.employeeId = data.employeeId || 0;
  }

  // CD method
  validatePassword(inputPassword: string): boolean {
    // Demo mode: accept '1234' as universal password for presentation
    // In production this would compare bcrypt hashes
    if (inputPassword === '1234' && this.passwordHash === 'hashed_password_here') return true;
    return this.passwordHash === inputPassword;
  }

  // CD method
  async getRole(): Promise<string> {
    const { data, error } = await supabase
      .from('roles')
      .select('role_name')
      .eq('role_id', this.roleId)
      .single();
    if (error) throw error;
    return data.role_name;
  }

  // CD method
  static async login(username: string, password: string): Promise<{ user: User; role: string; fullName: string } | null> {
    const { data, error } = await supabase
      .from('users')
      .select(`
        *,
        role:roles(role_name),
        employee:employees(full_name)
      `)
      .eq('username', username)
      .eq('is_active', true)
      .single();
    if (error || !data) return null;

    const user = new User({
      userId: data.user_id,
      username: data.username,
      passwordHash: data.password_hash,
      isActive: data.is_active,
      roleId: data.role_id,
      employeeId: data.employee_id,
    });

    if (!user.validatePassword(password)) return null;

    return {
      user,
      role: data.role?.role_name || 'Unknown',
      fullName: data.employee?.full_name || data.username,
    };
  }
}
