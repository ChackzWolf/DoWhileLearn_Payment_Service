import { handleUnaryCall } from '@grpc/grpc-js';
import * as grpc from '@grpc/grpc-js';
import { OrderService } from "../Use.case/Order.Use.case";
import { IOrder } from "../Interfaces/IOrder";

class OrderController {
    private orderService: OrderService;

    constructor() {
        this.orderService = new OrderService();
    }

    createStripeSession: handleUnaryCall<IOrder, any> = async (call, callback) => {
        try {
            const orderData: IOrder = call.request;
            console.log("Received order data from API Gateway:", orderData);
            const result = await this.orderService.createStripeSession(orderData);

            if (result.success) {
                console.log("Order placed successfully:", result);

                callback(null, { session_id: result.sessionId }); // Send order data in response
            } else {
                console.log("Order placement failed:", result.message);
                callback(null, { session_id: "", data: null }); // Send empty session id and null data on failure
            }
        } catch (error) {
            console.error("Error in purchasing the course:", error);
            callback(error as grpc.ServiceError);
        }
    };  

    HandleSuccessPayment: handleUnaryCall<any,any> = async( call, callback) => {
        const data = call.request;
        console.log(data, 'data session id')
        const result = await this.orderService.successPayment(data.sessionId);
        console.log(result, 'result from successPayment')
        callback(null, result)
    }
}

export default OrderController;
 