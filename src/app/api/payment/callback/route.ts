import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyNotificationSignature, mapMidtransStatus, type MidtransNotification } from '@/lib/midtrans';

/**
 * POST - Midtrans notification handler
 * Dipanggil oleh Midtrans setelah ada perubahan status transaksi
 * Set URL ini di Midtrans Dashboard > Settings > Configuration > Notification URL
 */
export async function POST(req: Request) {
  try {
    const body: MidtransNotification = await req.json();

    const {
      order_id,
      transaction_id,
      transaction_status,
      fraud_status,
      gross_amount,
    } = body;

    // Verify notification signature
    const isValid = verifyNotificationSignature(body);
    if (!isValid) {
      console.error('Invalid Midtrans notification signature');
      return NextResponse.json(
        { success: false, message: 'Invalid signature' },
        { status: 400 }
      );
    }

    // Find the payment order by merchantRef (order_id)
    const paymentOrder = await prisma.paymentOrder.findUnique({
      where: { merchantRef: order_id },
      include: {
        contribution: true,
      },
    });

    if (!paymentOrder) {
      return NextResponse.json(
        { success: false, message: 'Payment order not found' },
        { status: 404 }
      );
    }

    // Map Midtrans status to our internal status
    const mappedStatus = mapMidtransStatus(transaction_status, fraud_status);

    if (mappedStatus === 'PAID') {
      // Update payment order
      await prisma.paymentOrder.update({
        where: { id: paymentOrder.id },
        data: {
          status: 'PAID',
          paidAt: new Date(),
          midtransId: transaction_id,
        },
      });

      // Update contribution
      await prisma.contribution.update({
        where: { id: paymentOrder.contributionId },
        data: {
          status: 'PAID',
          paidAt: new Date(),
        },
      });

      // Update cash balance
      const existingBalance = await prisma.cashBalance.findFirst();
      if (existingBalance) {
        await prisma.cashBalance.update({
          where: { id: existingBalance.id },
          data: {
            balance: { increment: paymentOrder.amount },
          },
        });
      } else {
        await prisma.cashBalance.create({
          data: {
            balance: paymentOrder.amount,
          },
        });
      }

      // Log activity
      await prisma.activityLog.create({
        data: {
          action: 'PAYMENT_PAID',
          performedBy: paymentOrder.userId,
          details: JSON.stringify({
            orderId: order_id,
            transactionId: transaction_id,
            amount: paymentOrder.amount,
            grossAmount: gross_amount,
          }),
        },
      });
    } else if (mappedStatus === 'EXPIRED') {
      await prisma.paymentOrder.update({
        where: { id: paymentOrder.id },
        data: { status: 'EXPIRED', midtransId: transaction_id },
      });

      await prisma.contribution.update({
        where: { id: paymentOrder.contributionId },
        data: { status: 'EXPIRED' },
      });
    } else if (mappedStatus === 'FAILED') {
      await prisma.paymentOrder.update({
        where: { id: paymentOrder.id },
        data: { status: 'FAILED', midtransId: transaction_id },
      });

      await prisma.contribution.update({
        where: { id: paymentOrder.contributionId },
        data: { status: 'FAILED' },
      });
    }

    // Midtrans expects 200 OK response
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Midtrans notification error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
