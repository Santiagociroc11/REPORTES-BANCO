const API_URL = 'http://localhost:3000/api';

export async function notifyTransaction(transactionId: string): Promise<void> {
  try {
    const response = await fetch(`${API_URL}/notify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ transaction_id: transactionId }),
    });

    if (!response.ok) {
      throw new Error('Error al enviar notificación');
    }
  } catch (error) {
    console.error('Error al notificar transacción:', error);
    throw error;
  }
}