import { IOrder } from "../Interfaces/IOrder";
import dotenv from 'dotenv';
dotenv.config();

import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export class OrderService {
    

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
    
            if (session.payment_status === 'paid') {
                // Make a request to the Order Service to create the order
                const orderResponse = {
                    userId: session.metadata?.userId,  // Example of extra value
                    courseId: session.metadata?.courseId, // Another example
                    tutorId: session.metadata?.tutorId,
                    category: session.metadata?.category,
                    thumbnail: session.metadata?.thumbnail,
                    title: session.metadata?.title,
                    price: session.metadata?.price,
                    level: session.metadata?.level,
                    totalLessons: session.metadata?.totalLessons,
                    transactionId:sessionId
                }
                console.log(orderResponse, 'order resonse from user case')
                return orderResponse;
            } 
        } catch (error) {


        }
    }
}
