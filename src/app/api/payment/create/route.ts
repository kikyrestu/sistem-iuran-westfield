import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { createQrisTransaction, getQrUrl, generateOrderId } from '@/lib/midtrans';
import { rateLimit, getClientIp } from '@/lib/rateLimit';

/**
 * GET - Check existing payment for current week
 */
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(req.url);
    const week = parseInt(url.searchParams.get('week') || '0');
    const year = parseInt(url.searchParams.get('year') || '0');

    if (!week || !year) {
      return NextResponse.json(
        { success: false, message: 'Week dan year wajib diisi' },
        { status: 400 }
      );
    }

    // Find existing contribution for this week
    const contribution = await prisma.contribution.findUnique({
      where: {
        userId_weekNumber_year: {
          userId: session.user.id,
          weekNumber: week,
          year,
        },
      },
      include: {
        paymentOrder: true,
      },
    });

    if (!contribution) {
      return NextResponse.json({ success: true, data: null });
    }

    if (contribution.status === 'PAID') {
      return NextResponse.json({
        success: true,
        data: { status: 'PAID' },
      });
    }

    if (contribution.paymentOrder) {
      const po = contribution.paymentOrder;
      return NextResponse.json({
        success: true,
        data: {
          id: po.id,
          merchantRef: po.merchantRef,
          midtransId: po.midtransId,
          amount: po.amount,
          fee: po.fee,
          totalAmount: po.totalAmount,
          paymentMethod: po.paymentMethod,
          status: po.status,
          qrUrl: po.qrUrl,
          qrString: po.qrString,
          expiredAt: po.expiredAt?.toISOString() || null,
          paidAt: po.paidAt?.toISOString() || null,
          createdAt: po.createdAt.toISOString(),
        },
      });
    }

    return NextResponse.json({ success: true, data: null });
  } catch (error) {
    console.error('Payment GET error:', error instanceof Error ? error.message : 'Unknown error');
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST - Create new payment/contribution
 */
export async function POST(req: Request) {
  try {
    // Rate limit: max 5 payment creations per minute per IP
    const ip = getClientIp(req);
    if (!rateLimit(ip, 5, 60000)) {
      return NextResponse.json(
        { success: false, message: 'Terlalu banyak request. Coba lagi nanti.' },
        { status: 429 }
      );
    }

    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { amount, weekNumber, year } = body;

    // Validate amount (type + range)
    if (!amount || typeof amount !== 'number' || !Number.isInteger(amount) || amount < 5000 || amount > 10000) {
      return NextResponse.json(
        { success: false, message: 'Nominal harus antara Rp 5.000 - Rp 10.000' },
        { status: 400 }
      );
    }

    // Validate weekNumber and year
    const currentYear = new Date().getFullYear();
    if (
      !weekNumber || typeof weekNumber !== 'number' || !Number.isInteger(weekNumber) ||
      weekNumber < 1 || weekNumber > 53 ||
      !year || typeof year !== 'number' || !Number.isInteger(year) ||
      year < currentYear - 1 || year > currentYear + 1
    ) {
      return NextResponse.json(
        { success: false, message: 'Week dan year tidak valid' },
        { status: 400 }
      );
    }

    // Check if already paid this week
    const existing = await prisma.contribution.findUnique({
      where: {
        userId_weekNumber_year: {
          userId: session.user.id,
          weekNumber,
          year,
        },
      },
    });

    if (existing?.status === 'PAID') {
      return NextResponse.json(
        { success: false, message: 'Kamu sudah bayar iuran minggu ini!' },
        { status: 400 }
      );
    }

    // Delete existing unpaid contribution if any
    if (existing) {
      await prisma.paymentOrder.deleteMany({
        where: { contributionId: existing.id },
      });
      await prisma.contribution.delete({
        where: { id: existing.id },
      });
    }

    // Create contribution record
    const contribution = await prisma.contribution.create({
      data: {
        userId: session.user.id,
        amount,
        weekNumber,
        year,
        status: 'UNPAID',
      },
    });

    // Generate unique order ID
    const orderId = generateOrderId();

    // Create Midtrans QRIS transaction
    const midtransResponse = await createQrisTransaction({
      orderId,
      amount,
      customerName: session.user.name || session.user.sampName,
      customerEmail: session.user.email || '',
      itemName: `Iuran Minggu ke-${weekNumber} (${year})`,
    });

    const qrUrl = getQrUrl(midtransResponse);
    const expiryTime = midtransResponse.expiry_time
      ? new Date(midtransResponse.expiry_time)
      : new Date(Date.now() + 24 * 60 * 60 * 1000);

    // Save payment order
    const paymentOrder = await prisma.paymentOrder.create({
      data: {
        contributionId: contribution.id,
        userId: session.user.id,
        merchantRef: orderId,
        midtransId: midtransResponse.transaction_id,
        amount,
        fee: 0, // Midtrans fee ditanggung merchant, bukan customer
        totalAmount: amount,
        paymentMethod: 'QRIS',
        status: 'UNPAID',
        qrUrl,
        qrString: null,
        expiredAt: expiryTime,
      },
    });

    // Log activity
    await prisma.activityLog.create({
      data: {
        action: 'PAYMENT_CREATED',
        performedBy: session.user.id,
        details: JSON.stringify({
          orderId,
          transactionId: midtransResponse.transaction_id,
          amount,
          weekNumber,
          year,
        }),
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        id: paymentOrder.id,
        merchantRef: paymentOrder.merchantRef,
        midtransId: paymentOrder.midtransId,
        amount: paymentOrder.amount,
        fee: paymentOrder.fee,
        totalAmount: paymentOrder.totalAmount,
        paymentMethod: paymentOrder.paymentMethod,
        status: paymentOrder.status,
        qrUrl: paymentOrder.qrUrl,
        qrString: paymentOrder.qrString,
        expiredAt: paymentOrder.expiredAt?.toISOString() || null,
        paidAt: null,
        createdAt: paymentOrder.createdAt.toISOString(),
      },
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : '';
    console.error('=== PAYMENT CREATE ERROR ===');
    console.error('Error message:', errorMsg);
    console.error('Error stack:', errorStack);
    console.error('=== PAYMENT CREATE ERROR END ===');
    return NextResponse.json(
      { success: false, message: `Gagal membuat pembayaran: ${errorMsg}` },
      { status: 500 }
    );
  }
}
