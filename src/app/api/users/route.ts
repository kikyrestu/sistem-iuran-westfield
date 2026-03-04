import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';

/**
 * GET - List all users (admin only)
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, message: 'Admin access required' },
        { status: 403 }
      );
    }

    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        sampName: true,
        role: true,
        isActive: true,
        createdAt: true,
        _count: {
          select: {
            contributions: {
              where: { status: 'PAID' },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      success: true,
      data: users.map((u) => ({
        ...u,
        createdAt: u.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error('Users GET error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST - Create new user (admin only)
 */
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, message: 'Admin access required' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { name, email, password, sampName, role } = body;

    if (!name || !email || !password || !sampName) {
      return NextResponse.json(
        { success: false, message: 'Semua field wajib diisi' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { success: false, message: 'Password minimal 6 karakter' },
        { status: 400 }
      );
    }

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { success: false, message: 'Email sudah terdaftar' },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        sampName,
        role: role === 'ADMIN' ? 'ADMIN' : 'STAFF',
      },
    });

    // Log activity
    await prisma.activityLog.create({
      data: {
        action: 'USER_CREATED',
        performedBy: session.user.id,
        details: JSON.stringify({
          userId: user.id,
          name,
          email,
          sampName,
          role: user.role,
        }),
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        sampName: user.sampName,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Users POST error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PATCH - Update user status (admin only)
 */
export async function PATCH(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, message: 'Admin access required' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { userId, isActive } = body;

    if (!userId || typeof isActive !== 'boolean') {
      return NextResponse.json(
        { success: false, message: 'userId dan isActive wajib diisi' },
        { status: 400 }
      );
    }

    // Don't allow admin to deactivate themselves
    if (userId === session.user.id && !isActive) {
      return NextResponse.json(
        { success: false, message: 'Tidak bisa menonaktifkan akun sendiri' },
        { status: 400 }
      );
    }

    await prisma.user.update({
      where: { id: userId },
      data: { isActive },
    });

    // Log activity
    await prisma.activityLog.create({
      data: {
        action: isActive ? 'USER_ACTIVATED' : 'USER_DEACTIVATED',
        performedBy: session.user.id,
        details: JSON.stringify({ userId }),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Users PATCH error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE - Delete user (admin only)
 */
export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, message: 'Admin access required' },
        { status: 403 }
      );
    }

    const url = new URL(req.url);
    const id = url.searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, message: 'User ID wajib diisi' },
        { status: 400 }
      );
    }

    // Don't allow admin to delete themselves
    if (id === session.user.id) {
      return NextResponse.json(
        { success: false, message: 'Tidak bisa menghapus akun sendiri' },
        { status: 400 }
      );
    }

    // Delete user (cascade will handle related records)
    await prisma.user.delete({ where: { id } });

    // Log activity
    await prisma.activityLog.create({
      data: {
        action: 'USER_DELETED',
        performedBy: session.user.id,
        details: JSON.stringify({ userId: id }),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Users DELETE error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
