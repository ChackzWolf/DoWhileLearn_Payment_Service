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
const stripe = new stripe_1.default(ENV_configs_1.configs.STRIPE_SECRET_KEY);
class OrderService {
    createStripeSession(orderData) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                console.log('Reached use case for purchasing order');
                // // Save the order in the database
                // const order = await this.orderRepo.saveOrder({
                //     ...orderData,
                //     transactionId: session.id,
                //     paymentStatus: false,
                // });
                console.log(orderData, 'orderdatatata');
                // Encode the thumbnail URL to ensure it's valid for Stripe
                const encodedThumbnail = encodeURI(orderData.thumbnail);
                // Create a Stripe Checkout session
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
                // Save the order in the database
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
            var _a, _b, _c, _d, _e, _f, _g, _h, _j;
            try {
                const session = yield stripe.checkout.sessions.retrieve(sessionId);
                if (session.payment_status === 'paid') {
                    // Make a request to the Order Service to create the order
                    const orderResponse = {
                        userId: (_a = session.metadata) === null || _a === void 0 ? void 0 : _a.userId, // Example of extra value
                        courseId: (_b = session.metadata) === null || _b === void 0 ? void 0 : _b.courseId, // Another example
                        tutorId: (_c = session.metadata) === null || _c === void 0 ? void 0 : _c.tutorId,
                        category: (_d = session.metadata) === null || _d === void 0 ? void 0 : _d.category,
                        thumbnail: (_e = session.metadata) === null || _e === void 0 ? void 0 : _e.thumbnail,
                        title: (_f = session.metadata) === null || _f === void 0 ? void 0 : _f.title,
                        price: (_g = session.metadata) === null || _g === void 0 ? void 0 : _g.price,
                        level: (_h = session.metadata) === null || _h === void 0 ? void 0 : _h.level,
                        totalLessons: (_j = session.metadata) === null || _j === void 0 ? void 0 : _j.totalLessons,
                        transactionId: sessionId
                    };
                    console.log(orderResponse, 'order resonse from user case');
                    return orderResponse;
                }
            }
            catch (error) {
            }
        });
    }
}
exports.OrderService = OrderService;
