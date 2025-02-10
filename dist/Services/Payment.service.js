"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrderService = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const stripe_1 = __importDefault(require("stripe"));
const ENV_configs_1 = require("../ENV-Configs/ENV.configs");
const KafkaConfig_1 = require("../ENV-Configs/KafkaConfig");
const TransactionId_generator_1 = require("../Utils/OrderUtils/TransactionId.generator");
const stripe = new stripe_1.default(ENV_configs_1.configs.STRIPE_SECRET_KEY);
class OrderService {
    createStripeSession(orderData) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                console.log('Reached use case for purchasing order');
                console.log(orderData, 'orderdatatata');
                // Encode the thumbnail URL to ensure it's valid for Stripe
                const encodedThumbnail = encodeURI(orderData.thumbnail);
                const session = yield stripe.checkout.sessions.create({
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
                        userId: orderData.userId, // Example of extra value
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
                return {
                    success: true,
                    message: "Order successfully created",
                    sessionId: session.id,
                };
            }
            catch (error) {
                console.log("Error in purchasing course(use-case):", error);
                return { success: false, message: "Failed to create order." };
            }
        });
    }
    successPayment(sessionId) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d, _e, _f, _g, _h;
            const session = yield stripe.checkout.sessions.retrieve(sessionId);
            try {
                console.log(session, 'this is session');
                if (session.payment_status === 'paid' && ((_a = session.metadata) === null || _a === void 0 ? void 0 : _a.price)) {
                    const purchasedAmount = parseInt((_b = session.metadata) === null || _b === void 0 ? void 0 : _b.price);
                    const { tutorId, courseId, userId } = session.metadata;
                    const transactionId = (0, TransactionId_generator_1.generateTransactionId)(tutorId, courseId, userId);
                    const shareForTutor = (purchasedAmount * 0.95).toFixed(2);
                    const shareForAdmin = purchasedAmount - parseInt(shareForTutor);
                    const adminShare = shareForAdmin.toString();
                    const tutorShare = shareForTutor.toString();
                    console.log(tutorShare, adminShare, '///////////////////////');
                    // Make a request to the Order Service to create the order
                    const event = {
                        userId: (_c = session.metadata) === null || _c === void 0 ? void 0 : _c.userId, // Example of extra value
                        courseId: (_d = session.metadata) === null || _d === void 0 ? void 0 : _d.courseId, // Another example
                        tutorId: (_e = session.metadata) === null || _e === void 0 ? void 0 : _e.tutorId,
                        thumbnail: (_f = session.metadata) === null || _f === void 0 ? void 0 : _f.thumbnail,
                        title: (_g = session.metadata) === null || _g === void 0 ? void 0 : _g.title,
                        price: (_h = session.metadata) === null || _h === void 0 ? void 0 : _h.price,
                        adminShare,
                        tutorShare,
                        transactionId,
                        paymentStatus: true,
                        timestamp: new Date(),
                        status: "SUCCESS"
                    };
                    console.log('firtsfirtstfirst');
                    yield KafkaConfig_1.kafkaConfig.sendMessage('payment.success', event);
                    const response = yield KafkaConfig_1.kafkaConfig.handlePaymentTransaction(event);
                    if (response.status === 'SUCCESS') {
                        console.log('triggered success');
                        return { success: true, data: session.metadata, message: "Payment successful" };
                    }
                    else {
                        console.log('triggered fail');
                        return { success: false, message: 'transaction failed', data: session.metadata };
                    }
                }
            }
            catch (error) {
                console.error('Payment processing failed:', error);
                return { success: false, message: 'transaction failed', data: session.metadata };
            }
        });
    }
    rollbackPayment(transactionId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Implement refund logic using Stripe
                yield stripe.refunds.create({
                    payment_intent: transactionId,
                    reason: 'requested_by_customer',
                });
                yield KafkaConfig_1.kafkaConfig.sendMessage('rollback-completed', {
                    transactionId,
                    service: 'PAYMENT_SERVICE'
                });
            }
            catch (error) {
                console.error('Payment rollback failed:', error);
                // Handle rollback failure
            }
        });
    }
}
exports.OrderService = OrderService;
