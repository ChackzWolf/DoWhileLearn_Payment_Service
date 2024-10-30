import { IOrder } from "../Interfaces/IOrder";
import dotenv from 'dotenv';
dotenv.config();

import Stripe from "stripe";
import { configs } from "../ENV-Configs/ENV.configs";
import { kafkaConfig } from "../ENV-Configs/KafkaConfig";
import { KafkaConfig, KafkaMessage } from "kafkajs";
export interface OrderEventData {
    userId: string;
    tutorId: string;
    courseId: string;
    transactionId: string;
    title: string;
    thumbnail: string;
    price: string;
    adminShare: string; 
    tutorShare: string;
    paymentStatus:boolean;
    timestamp: Date;
    status: string;
  }
const stripe = new Stripe(configs.STRIPE_SECRET_KEY!);

export class OrderService {

    // constructor(private readonly kafkaConfig: KafkaConfig) {}

    async createStripeSession(orderData: IOrder) {
        try {
            console.log('Reached use case for purchasing order');

                        // // Save the order in the database
                        // const order = await this.orderRepo.saveOrder({
                        //     ...orderData,
                        //     transactionId: session.id,
                        //     paymentStatus: false,
                        // });

                        console.log(orderData, 'orderdatatata')

            // Encode the thumbnail URL to ensure it's valid for Stripe
            const encodedThumbnail = encodeURI(orderData.thumbnail);

            // Create a Stripe Checkout session
            const session = await stripe.checkout.sessions.create({
                payment_method_types: ['card'],
                line_items: [
                    {
                        price_data: {
                            currency: 'inr', 
                            product_data: { 
                                name: orderData.title,
                                images: [encodedThumbnail], // Use encoded thumbnail URL
                            },
                            unit_amount: parseInt(orderData.price) * 100, // Assuming price is in dollars
                        },
                        quantity: 1,
                    },
                ],
                mode: 'payment',
                success_url: `http://localhost:5173/user/payment/success?session_id={CHECKOUT_SESSION_ID}`,
                cancel_url: `http://localhost:5173//user/payment/failed?courseID{orderData.courseId}`,
                metadata: {
                    userId: orderData.userId,  // Example of extra value
                    courseId: orderData.courseId, // Another example
                    tutorId: orderData.tutorId,
                    category: orderData.category,
                    thumbnail: encodedThumbnail,
                    title: orderData.title,
                    price: orderData.price,
                    discountPrice: orderData.discountPrice,
                    level: orderData.level,
                    totalLessons: orderData.totalLessons
                    // Add any additional key-value pairs as needed
                },
            }); 

            // Save the order in the database


            return {
                success: true,
                message: "Order successfully created",
                sessionId: session.id, 
            };
        } catch (error) {
            console.log("Error in purchasing course(use-case):", error);
            return { success: false, message: "Failed to create order." };
        }
    }

    async successPayment(sessionId:string){
        try {
            const session = await stripe.checkout.sessions.retrieve(sessionId);

            console.log(session,'this is session')


            if (session.payment_status === 'paid' && session.metadata?.price) {
                const purchasedAmount = parseInt(session.metadata?.price);

                const shareForTutor = (purchasedAmount * 0.95).toFixed(2)
                const shareForAdmin = purchasedAmount - parseInt(shareForTutor);
                const adminShare = shareForAdmin.toString()
                const tutorShare = shareForTutor.toString()
                console.log(tutorShare,adminShare,'///////////////////////')
                // Make a request to the Order Service to create the order
                const event:OrderEventData = {
                    userId: session.metadata?.userId,  // Example of extra value
                    courseId: session.metadata?.courseId, // Another example
                    tutorId: session.metadata?.tutorId,
                    thumbnail: session.metadata?.thumbnail,
                    title: session.metadata?.title,
                    price: session.metadata?.price,
                    adminShare,
                    tutorShare,
                    transactionId:sessionId,
                    paymentStatus:true, 
                    timestamp: new Date(),
                    status: "SUCCESS"
                }
                await kafkaConfig.sendMessage('payment.success', event)
                console.log(event, 'order resonse from user case//////////////////////////')
                await this.setupTransactionListener(sessionId);
                return session.metadata;
            } 
        } catch (error:any)  {
            console.error('Payment processing failed:', error);
            
            const failureEvent = {
              transactionId: sessionId,
              status: 'FAILED',
              error: error.message || 'just error',
              // Include other required fields with default/empty values
              userId: '',
              courseId: '',
              tutorId: '',
              thumbnail: '',
              title: '',
              price: '',
              adminShare: '',
              tutorShare: '',
              paymentStatus: false,
              timestamp: new Date()
            };
       
            await kafkaConfig.sendMessage('payment.failed', failureEvent);
            throw error;
        }
    }

    async setupTransactionListener(transactionId: string): Promise<void> {
        await kafkaConfig.consumeMessages(
            'paymen-service-group',
          ['transaction.complete'],
            async (message: KafkaMessage) => {
            const data = JSON.parse(message.value?.toString() || '');
              if (data.transactionId === transactionId) {
                if (data.status === 'FAILED') {
                  // Handle payment rollback if needed
                  await this.rollbackPayment(transactionId);
                }
                // Could emit events or update local state based on the final status
              }
            }
        );
    }
        
    async rollbackPayment(transactionId: string): Promise<void> {
      try {
        // Implement refund logic using Stripe
        await stripe.refunds.create({
          payment_intent: transactionId,
          reason: 'requested_by_customer',
        });
        
        await kafkaConfig.sendMessage('rollback-completed', {
          transactionId,
          service: 'PAYMENT_SERVICE'
        });
      } catch (error) {
        console.error('Payment rollback failed:', error);
        // Handle rollback failure
      }
    }
        


    
}
