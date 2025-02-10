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
Object.defineProperty(exports, "__esModule", { value: true });
const Payment_service_1 = require("../Services/Payment.service");
const orderService = new Payment_service_1.OrderService();
class PaymentController {
    constructor() {
        this.createStripeSession = (call, callback) => __awaiter(this, void 0, void 0, function* () {
            try {
                const orderData = call.request;
                console.log("Received order data from API Gateway:", orderData);
                const result = yield this.orderService.createStripeSession(orderData);
                if (result.success) {
                    console.log("Order placed successfully:", result);
                    callback(null, { session_id: result.sessionId }); // Send order data in response
                }
                else {
                    console.log("Order placement failed:", result.message);
                    callback(null, { session_id: "", data: null }); // Send empty session id and null data on failure
                }
            }
            catch (error) {
                console.error("Error in purchasing the course:", error);
                callback(error);
            }
        });
        this.HandleSuccessPayment = (call, callback) => __awaiter(this, void 0, void 0, function* () {
            const data = call.request;
            console.log(data, 'data session id');
            const result = yield this.orderService.successPayment(data.sessionId);
            console.log(result, 'result from successPayment');
            callback(null, result);
        });
        this.orderService = new Payment_service_1.OrderService();
    }
}
exports.default = PaymentController;
