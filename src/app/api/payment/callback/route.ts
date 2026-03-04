import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyNotificationSignature, mapMidtransStatus, type MidtransNotification } from '@/lib/midtrans';
import { rateLimit, getClientIp } from '@/lib/rateLimit';

/**
 * POST - Midtrans notification handler
 * Dipanggil oleh Midtrans setelah ada perubahan status transaksi
 * Set URL ini di Midtrans Dashboard > Settings > Configuration > Notification URL
 */
export async function POST(req: Request) {
  try {
    // Rate limit: max 30 callbacks per minute per IP
    const ip = getClientIp(req);
    if (!rateLimit(ip, 30, 60000)) {
      return NextResponse.json(
        { success: false, message: 'Too many requests' },
        { status: 429 }
      );
    }

    // Handle empty body or test ping from Midtrans
    let body: MidtransNotification;
    try {
      body = await req.json();
    } catch {
      // Midtrans test notification or empty body
      return NextResponse.json({ success: true, message: 'OK' });
    }

    // Handle test notification (no order_id means it's a test)
    if (!body || !body.order_id) {
      return NextResponse.json({ success: true, message: 'Test notification received' });
    }

    const {
      order_id,
      transaction_id,
      transaction_status,
      fraud_status,
      gross_amount,
    } = body;

    // Validate required fields
    if (!order_id || !transaction_status || !gross_amount) {
      return NextResponse.json(
        { success: false, message: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Verify notification signature
    const isValid = verifyNotificationSignature(body);
    if (!isValid) {
      console.error('Invalid Midtrans notification signature for order:', order_id);
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
      // CRITICAL FIX: Idempotency check - prevent replay attacks / double crediting
      if (paymentOrder.status === 'PAID') {
        return NextResponse.json({ success: true, message: 'Already processed' });
      }

      // CRITICAL FIX: Cross-verify payment amount against database
      const expectedAmount = paymentOrder.amount;
      const receivedAmount = parseFloat(gross_amount);
      if (receivedAmount !== expectedAmount) {
        console.error(
          `Amount mismatch for ${order_id}: expected ${expectedAmount}, received ${receivedAmount}`
        );
        return NextResponse.json(
          { success: false, message: 'Amount mismatch' },
          { status: 400 }
        );
      }

      // MEDIUM FIX: Use database transaction for atomicity
      await prisma.$transaction(async (tx) => {
        // Update payment order
        await tx.paymentOrder.update({
          where: { id: paymentOrder.id },
          data: {
            status: 'PAID',
            paidAt: new Date(),
            midtransId: transaction_id,
          },
        });

        // Update contribution
        await tx.contribution.update({
          where: { id: paymentOrder.contributionId },
          data: {
            status: 'PAID',
            paidAt: new Date(),
          },
        });

        // Update cash balance
        const existingBalance = await tx.cashBalance.findFirst();
        if (existingBalance) {
          await tx.cashBalance.update({
            where: { id: existingBalance.id },
            data: {
              balance: { increment: paymentOrder.amount },
            },
          });
        } else {
          await tx.cashBalance.create({
            data: {
              balance: paymentOrder.amount,
            },
          });
        }

        // Log activity
        await tx.activityLog.create({
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
      });
    } else if (mappedStatus === 'EXPIRED') {
      // Only update if not already in a final state
      if (paymentOrder.status !== 'PAID') {
        await prisma.paymentOrder.update({
          where: { id: paymentOrder.id },
          data: { status: 'EXPIRED', midtransId: transaction_id },
        });

        await prisma.contribution.update({
          where: { id: paymentOrder.contributionId },
          data: { status: 'EXPIRED' },
        });
      }
    } else if (mappedStatus === 'FAILED') {
      // Only update if not already in a final state
      if (paymentOrder.status !== 'PAID') {
        await prisma.paymentOrder.update({
          where: { id: paymentOrder.id },
          data: { status: 'FAILED', midtransId: transaction_id },
        });

        await prisma.contribution.update({
          where: { id: paymentOrder.contributionId },
          data: { status: 'FAILED' },
        });
      }
    }

    // Midtrans expects 200 OK response
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Midtrans notification error:', error instanceof Error ? error.message : 'Unknown error');
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
