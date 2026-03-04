import crypto from 'crypto';

/**
 * Read env vars at runtime (not module init time)
 * This is critical for Vercel serverless functions
 */
function getServerKey(): string {
  return (process.env.MIDTRANS_SERVER_KEY || '').trim();
}

function isProduction(): boolean {
  return (process.env.MIDTRANS_IS_PRODUCTION || '').trim() === 'true';
}

function getBaseUrl(): string {
  return isProduction()
    ? 'https://api.midtrans.com/v2'
    : 'https://api.sandbox.midtrans.com/v2';
}

/**
 * Generate Basic Auth header dari Server Key
 */
function getAuthHeader(): string {
  const encoded = Buffer.from(`${getServerKey()}:`).toString('base64');
  return `Basic ${encoded}`;
}

interface CreateQrisParams {
  orderId: string;
  amount: number;
  customerName: string;
  customerEmail: string;
  itemName: string;
}

interface MidtransChargeResponse {
  status_code: string;
  status_message: string;
  transaction_id: string;
  order_id: string;
  merchant_id: string;
  gross_amount: string;
  currency: string;
  payment_type: string;
  transaction_time: string;
  transaction_status: string;
  fraud_status: string;
  acquirer: string;
  actions: {
    name: string;
    method: string;
    url: string;
  }[];
  expiry_time: string;
}

interface MidtransNotification {
  transaction_time: string;
  transaction_status: string;
  transaction_id: string;
  status_message: string;
  status_code: string;
  signature_key: string;
  payment_type: string;
  order_id: string;
  merchant_id: string;
  gross_amount: string;
  fraud_status: string;
  currency: string;
}

/**
 * Buat transaksi QRIS di Midtrans
 */
export async function createQrisTransaction(
  params: CreateQrisParams
): Promise<MidtransChargeResponse> {
  const payload = {
    payment_type: 'qris',
    transaction_details: {
      order_id: params.orderId,
      gross_amount: params.amount,
    },
    qris: {
      acquirer: 'gopay',
    },
    customer_details: {
      first_name: params.customerName,
      email: params.customerEmail,
    },
    item_details: [
      {
        id: params.orderId,
        name: params.itemName,
        price: params.amount,
        quantity: 1,
      },
    ],
    custom_expiry: {
      expiry_duration: 1440, // 24 jam dalam menit
      unit: 'minute',
    },
  };

  const baseUrl = getBaseUrl();
  const serverKey = getServerKey();
  console.log(`Midtrans config: production=${isProduction()}, url=${baseUrl}, keyPrefix=${serverKey.substring(0, 10)}...`);

  const response = await fetch(`${baseUrl}/charge`, {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'Authorization': getAuthHeader(),
    },
    body: JSON.stringify(payload),
  });

  const data: MidtransChargeResponse = await response.json();

  if (data.status_code !== '201') {
    console.error('Midtrans charge failed:', JSON.stringify(data));
    throw new Error(data.status_message || 'Gagal membuat transaksi Midtrans');
  }

  return data;
}

/**
 * Cek status transaksi di Midtrans
 */
export async function getTransactionStatus(orderId: string) {
  if (!/^[A-Za-z0-9_-]+$/.test(orderId)) {
    throw new Error('Invalid order ID format');
  }
  const response = await fetch(`${getBaseUrl()}/${encodeURIComponent(orderId)}/status`, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
      'Authorization': getAuthHeader(),
    },
  });

  const data = await response.json();
  return data;
}

/**
 * Cancel transaksi di Midtrans
 */
export async function cancelTransaction(orderId: string) {
  if (!/^[A-Za-z0-9_-]+$/.test(orderId)) {
    throw new Error('Invalid order ID format');
  }
  const response = await fetch(`${getBaseUrl()}/${encodeURIComponent(orderId)}/cancel`, {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Authorization': getAuthHeader(),
    },
  });

  const data = await response.json();
  return data;
}

/**
 * Verify notification signature dari Midtrans
 * SHA512(order_id + status_code + gross_amount + server_key)
 */
export function verifyNotificationSignature(notification: MidtransNotification): boolean {
  const { order_id, status_code, gross_amount, signature_key } = notification;
  
  if (!order_id || !status_code || !gross_amount || !signature_key) {
    return false;
  }

  const expectedSignature = crypto
    .createHash('sha512')
    .update(order_id + status_code + gross_amount + getServerKey())
    .digest('hex');

  // Timing-safe comparison to prevent timing attacks
  try {
    return crypto.timingSafeEqual(
      Buffer.from(expectedSignature, 'hex'),
      Buffer.from(signature_key, 'hex')
    );
  } catch {
    return false;
  }
}

/**
 * Extract QR code URL dari response Midtrans
 */
export function getQrUrl(response: MidtransChargeResponse): string | null {
  const generateAction = response.actions?.find(
    (action) => action.name === 'generate-qr-code'
  );
  return generateAction?.url || null;
}

/**
 * Map Midtrans transaction_status ke internal PaymentStatus
 */
export function mapMidtransStatus(
  transactionStatus: string,
  fraudStatus?: string
): 'PAID' | 'UNPAID' | 'EXPIRED' | 'FAILED' {
  switch (transactionStatus) {
    case 'capture':
      return fraudStatus === 'accept' ? 'PAID' : 'FAILED';
    case 'settlement':
      return 'PAID';
    case 'pending':
      return 'UNPAID';
    case 'deny':
    case 'cancel':
      return 'FAILED';
    case 'expire':
      return 'EXPIRED';
    default:
      return 'UNPAID';
  }
}

/**
 * Generate order ID unik
 */
export function generateOrderId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `WF-${timestamp}-${random}`.toUpperCase();
}

export type { MidtransChargeResponse, MidtransNotification };
