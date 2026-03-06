import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const isAdmin = session.user.role === 'ADMIN';

    const contributions = await prisma.contribution.findMany({
      where: isAdmin ? {} : { userId: session.user.id },
      include: {
        user: {
          select: { name: true, sampName: true },
        },
        confirmer: {
          select: { name: true, sampName: true },
        },
      },
      orderBy: [{ year: 'desc' }, { weekNumber: 'desc' }],
    });

    return NextResponse.json({
      success: true,
      data: contributions.map((c) => ({
        id: c.id,
        amount: c.amount,
        weekNumber: c.weekNumber,
        year: c.year,
        status: c.status,
        paidAt: c.paidAt?.toISOString() || null,
        confirmerName: c.confirmer?.sampName || null,
        proofNote: c.proofNote,
        createdAt: c.createdAt.toISOString(),
        user: {
          name: c.user.name,
          sampName: c.user.sampName,
        },
      })),
    });
  } catch (error) {
    console.error('Transactions API error:', error instanceof Error ? error.message : 'Unknown error');
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
