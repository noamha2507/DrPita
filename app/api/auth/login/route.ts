import { NextRequest, NextResponse } from 'next/server';
import { User } from '@/lib/models/User';

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json({ error: 'שם משתמש וסיסמה נדרשים' }, { status: 400 });
    }

    const result = await User.login(username, password);

    if (!result) {
      return NextResponse.json({ error: 'שם משתמש או סיסמה שגויים' }, { status: 401 });
    }

    return NextResponse.json({
      userId: result.user.userId,
      username: result.user.username,
      role: result.role,
      employeeId: result.user.employeeId,
      fullName: result.fullName,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'שגיאת שרת' }, { status: 500 });
  }
}
