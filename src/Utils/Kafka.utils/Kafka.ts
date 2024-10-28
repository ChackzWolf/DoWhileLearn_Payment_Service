// types/events.ts
export interface PaymentEvent {
  orderId: string;
  userId: string;
  courseId: string;
  tutorId: string;
  amount: number;
  status: 'SUCCESS' | 'FAILED';
  timestamp: Date;
}

// services/PaymentService.ts
import { kafkaConfig } from '../../ENV-Configs/KafkaConfig';
// import { PaymentEvent } from '../types/events';

export class PaymentService {
  async processPurchase(data: {
    userId: string; 
    courseId: string;
    tutorId: string;
    amount: number;
  }): Promise<void> {
    const orderId = `order-${Date.now()}`;

    try {
      // Mock payment processing
      const paymentSuccessful = await this.processPaymentTransaction(data); 
 
      const event: PaymentEvent = {
        orderId, 
        userId: data.userId,
        courseId: data.courseId, 
        tutorId: data.tutorId,
        amount: data.amount,
        status: "SUCCESS",
        timestamp: new Date()
      };

      // Send event to appropriate topic
      const topic = paymentSuccessful ? 'payment.success' : 'payment.failed';
      await kafkaConfig.sendMessage(topic, event);

    } catch (error) {
      console.error('Payment processing error:', error);
      throw error;
    }
  } 
  


  private async processPaymentTransaction(data: any): Promise<boolean> {
    // Implement actual payment processing logic here
    return true; // Mock success
  }
}